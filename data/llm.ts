// M1078: the LIVE tie-in — engaging an OpenAI-compatible chat completions endpoint
// instead of (or, on failure, beside) the deterministic local briefing.
//
// The project answers visitor questions about the seeded demo world with a canned simulator
// (askIntelligence → RowText rows): fast, offline, zero-dependency, and honest as long as it's
// labelled. This module adds the LIVE path the user asked for — a REAL model, grounded ONLY in
// this frozen world — but routes it through the project's own server, never straight from the
// browser to a third-party API.
//
// THE SECURITY CONTRACT (this is the whole reason the call goes through a proxy):
//   · A VITE_-prefixed key is inlined by Vite into the public JS bundle — anyone who loads the
//     site can read it out of dist/assets/*.js. So the API key lives ONLY on the server, in a
//     NON-VITE_ env var, and is read by the /api/llm/chat proxy (see scripts/llm-proxy.mjs).
//     This module never reads any VITE_-prefixed key and cannot see the key at all.
//   · VITE_LLM_ENABLED (a boolean, not a secret) and VITE_LLM_MODEL (a model name, not a secret)
//     are the only build-time signals the browser gets; both are safe to ship in the bundle.
//   · No enable flag → nothing crosses the wire. Every message is answered locally, exactly as
//     before, and the browser never even attempts the proxy.
//   · The model is briefed with a compact digest of the frozen world and told to refuse anything
//     beyond it ("this is a demo world; I'm not briefed on real football").
//   · Any live failure (network, 5xx, bad JSON, timeout, unconfigured proxy) degrades back to the
//     local simulator and the message is VISIBLE as a degraded one to the reader. No silent swap.
//   · The briefing is dense but small. Every entity it names comes from a fold over the seed;
//     proof-llm.mjs checks this, so even a hand-edit cannot brief the model about a stranger.

import { footballProvider } from "./footballService";
import leagueTables from "../services/league-service/src/main/resources/league-tables.json";
import { byOverall } from "@/domain/attributes";
import { DEEP_DIGEST } from "@/data/deepDigest";
import { measurePrompt, windowHistory, type PromptBudget } from "@/domain/promptBudget";

interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

// Only non-secret, public-by-nature signals come from the browser's build env. The key and the
// provider base URL are deliberately absent: they belong to the server-side proxy exclusively.
export const LLM_CONFIG = {
  endpoint: "/api/llm/chat",
  enabled: Boolean(import.meta.env.VITE_LLM_ENABLED),
  model: import.meta.env.VITE_LLM_MODEL ?? "gpt-6.2-sol",
  hasKey: Boolean(import.meta.env.VITE_LLM_ENABLED), // legacy name kept for the UI gate; means "live path armed"
} as const;

// The four states an on-demand brief surface moves through: the reader asks, the model streams,
// the answer is ready, or the model was not available and the deterministic fold stood in.
// Declared once here (a value-independent type-only door) so every wire surface that prints an
// "asking/folding/there" state imports it instead of spelling the union twice.
export type BriefStatus = "idle" | "streaming" | "ready" | "fold";

function buildWorldBriefing(): string {
  const provider = footballProvider;
  const clubs = provider.clubs();
  const players = provider.players();
  const competitions = provider.competitions();
  const best = [...players].sort(byOverall).slice(0, 8);
  // The frozen tables hand us the world's known leaders per competition — the exact same
  // snapshot the league service serves, which means one source of truth for every answer.
  type FrozenRow = { position: number; clubId: string; points: number; played: number; won: number; drawn: number; lost: number };
  const tables = (leagueTables as unknown as { tables: Record<string, { competitionId: string; name: string; rows: FrozenRow[] }> }).tables;
  const leaders = Object.values(tables)
    .map((t) => {
      const lead = t.rows[0];
      const club = provider.clubs().find((c) => c.id === lead.clubId);
      return `${t.name}: ${club?.name ?? lead.clubId} (${lead.points} pts, ${lead.played} pl)`;
    })
    .sort();
  const strongest = [...clubs].sort(byOverall).slice(0, 8);
  const byId = new Map([...provider.clubs().map((c) => [c.id, c] as const)]);
  const strongestLines = strongest.map((c) => c.name + " " + c.overall).join(", ");
  const bestLines = best.map((p) => {
    const club = byId.get(p.clubId);
    return p.name + " (" + p.position + ", " + p.overall + ", age " + p.age + " at " + (club?.short ?? "?") + ")";
  }).join(", ");
  const comps = competitions.map((c) => c.name).sort().join(", ");
  return [
    `DEMO WORLD OF FOOTBALL OS (frozen snapshot — not real football):`,
    `15 leagues, ${clubs.length} clubs, ${players.length} players.`,
    `Leagues: ${comps}.`,
    `Strongest clubs by overall: ${strongestLines}.`,
    `Leaders of the frozen tables: ${leaders.join("; ")}.`,
    `Highest-rated players: ${bestLines}.`,
    `The world is deterministic and seeded. Never invent fixtures, scores, clubs, players or competitions that are not in this briefing; if the visitor asks about something outside this demo world, say so plainly and do not guess.`,
    `Answer in the visitor's language. Be concrete and brief: a few tight sentences beats a long lecture. Prefer the numbers above to vague superlatives.`,
  ].join("\n");
}

export const WORLD_BRIEFING = buildWorldBriefing() + "\n\n" + DEEP_DIGEST;

/**
 * THE ONE ENVELOPE. Every ask in this app rides the same byte-stable prefix: WORLD_BRIEFING first,
 * the envelope second. Two doors that send two different first messages share NOTHING with the
 * provider's prefix cache — one hash-identical family gives one warm lane, deterministically.
 * The envelope is what changes between calls; the book in front of it never does.
 */
export const withWorldBook = (envelope: string): string => `${WORLD_BRIEFING}\n${envelope}`;

// ── M969 · the growing history window — M1246 · the policy now lives in domain/promptBudget.ts ──
// Provider prompt caches match the LONGEST COMMON PREFIX of consecutive requests. A sliding
// window (the old `slice(-6)`) shifts the whole history every turn, so request N+1 diverged
// from request N at its SECOND message and the cache could only ever reuse the system briefing.
// A window that GROWS keeps request N+1's prefix equal to all of request N (system + every
// prior turn), so the cached span covers the whole conversation and the cached-token count
// climbs with it. When the cap finally bites, the trim is BLOCK-ALIGNED — a whole block drops
// at once — so the prefix stays stable for many turns between trims instead of shifting one
// message per turn. The constants and the fold moved to domain/promptBudget.ts so the budget
// arithmetic and the call path read one source; these re-exports keep every older importer honest.
export { HISTORY_CAP, HISTORY_TRIM_BLOCK, windowHistory } from "@/domain/promptBudget";

// ── M1246 · the ask ledger — the last few asks, measured as they actually left ─────────────
// The cache observatory prints the canonical prefix size always, but it can only print what an
// ask carried when an ask really happened. This ring records the real envelope of the last
// ASK_RING_CAP asks (prefix chars, envelope chars, window kept/dropped, token estimate) at the
// moment callLlmStream assembles them, plus the wire outcome. It is a session ledger in memory,
// never persisted, and it is empty on a build with the live arm off — which is the honest thing
// for the panel to say. The numbers come from domain/promptBudget, not from a second calculation.
export const ASK_RING_CAP = 12;

/** How much of a question the ledger keeps for display. The measured sizes always use the full
 *  text; this only trims the string the panel prints, so a pasted essay cannot push a whole
 *  paragraph into one ledger row. Named because 140 is also the chronicler's word ceiling for a
 *  sealed tape — two different decisions that must never be silently merged into one number. */
const ASK_QUESTION_DISPLAY_CAP = 140;

export interface AskMeasurement extends PromptBudget {
  /** Epoch milliseconds when the ask left this module. */
  at: number;
  /** The question, truncated for display only — the measured sizes use the full text. */
  question: string;
  /** True when the proxy answered with the streaming frames; null until the response headers. */
  streamed: boolean | null;
  /** True when the model answered; null until the ask resolves; false on any degrade. */
  ok: boolean | null;
}

const askRing: AskMeasurement[] = [];

/** A copy of the ledger, newest first. Callers cannot append to the ring — only the call path does. */
export function recentAsks(): readonly AskMeasurement[] {
  return askRing.slice();
}

function recordAsk(question: string, history: readonly ChatMessage[], system: string): AskMeasurement {
  const entry: AskMeasurement = {
    at: Date.now(),
    question:
      question.length > ASK_QUESTION_DISPLAY_CAP
        ? question.slice(0, ASK_QUESTION_DISPLAY_CAP - 1) + "…"
        : question,
    ...measurePrompt({ system, prefix: WORLD_BRIEFING, history, question }),
    streamed: null,
    ok: null,
  };
  askRing.unshift(entry);
  if (askRing.length > ASK_RING_CAP) askRing.length = ASK_RING_CAP;
  return entry;
}

/** The ONE live call path — callLlmStream below. The plain buffered envelope survives only as
 * the degrade branch INSIDE the streaming reader (an older deploy). There is deliberately no
 * second, un-streamed entry point: one path, one cache contract, nothing to drift. */

// ── M969b · the streaming call — the model's own deltas reach the UI as they arrive ────────
// The proxy's streaming branch answers newline-delimited JSON frames ({t:"delta",d} …
// {t:"end"}); this reader invokes onDelta per frame so the chat can render progressively,
// and resolves with the assembled text. A proxy that answered the plain JSON envelope instead
// (an older deploy, an error) is read as one final delta — the caller cannot tell and need
// not care. Never throws: every failure resolves { ok:false }.
export interface CallOptions {
  /**
   * Replaces the default WORLD_BRIEFING system prompt for this one call — used by surfaces
   * that need a ground truth OTHER than the frozen seed (e.g. the live Bundesliga artifact).
   * The proxy, the key and the endpoint are unchanged; nothing leaves this module.
   */
  system?: string;
}

export async function callLlmStream(
  question: string,
  history: ChatMessage[] = [],
  onDelta: (delta: string) => void = () => {},
  options: CallOptions = {},
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!LLM_CONFIG.hasKey) return { ok: false, error: "no key configured" };
  const system = options.system ?? WORLD_BRIEFING;
  // M1246: the ledger measures the RAW history and lets the fold report its own trim, so an
  // ask that drops turns shows up as dropped turns instead of a silent zero. The envelope
  // two lines below is the same fold over the same input, so what is measured is what leaves.
  const ask = recordAsk(question, history, system);
  const window = windowHistory(history);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...window,
    { role: "user", content: question },
  ];
  try {
    const r = await fetch(LLM_CONFIG.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, model: LLM_CONFIG.model, stream: true }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) { ask.ok = false; ask.streamed = false; return { ok: false, error: `proxy ${r.status}` }; }
    const contentType = r.headers.get("content-type") ?? "";
    ask.streamed = !contentType.includes("application/json");
    // The plain JSON envelope: an error the proxy already degraded, or an older deploy.
    if (contentType.includes("application/json")) {
      const body = await r.json();
      const text: unknown = body?.text;
      if (typeof text !== "string" || !text.trim()) { ask.ok = false; return { ok: false, error: body?.error ?? "empty model response" }; }
      ask.ok = true;
      onDelta(text.trim());
      return { ok: true, text: text.trim() };
    }
    const reader = r.body?.getReader();
    if (!reader) { ask.ok = false; return { ok: false, error: "no stream body" }; }
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let error: string | null = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        try {
          const frame = JSON.parse(t) as { t?: string; d?: string; ok?: boolean; error?: string };
          if (frame.t === "delta" && typeof frame.d === "string" && frame.d) { text += frame.d; onDelta(frame.d); }
          if (frame.t === "end") {
            if (frame.ok === false && frame.error) error = frame.error;
          }
        } catch { /* a partial frame splits across chunks — the next read completes it */ }
      }
    }
    if (error) { ask.ok = false; return { ok: false, error }; }
    if (!text.trim()) { ask.ok = false; return { ok: false, error: "empty model response" }; }
    ask.ok = true;
    return { ok: true, text: text.trim() };
  } catch (err) {
    ask.ok = false;
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}
