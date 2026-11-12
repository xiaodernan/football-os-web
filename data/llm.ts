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

interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

// Only non-secret, public-by-nature signals come from the browser's build env. The key and the
// provider base URL are deliberately absent: they belong to the server-side proxy exclusively.
export const LLM_CONFIG = {
  endpoint: "/api/llm/chat",
  enabled: Boolean(import.meta.env.VITE_LLM_ENABLED),
  model: import.meta.env.VITE_LLM_MODEL ?? "gpt-6-sol",
  hasKey: Boolean(import.meta.env.VITE_LLM_ENABLED), // legacy name kept for the UI gate; means "live path armed"
} as const;

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
    return p.name + " (" + p.position + ", " + p.overall + " at " + (club?.short ?? "?") + ")";
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

export const WORLD_BRIEFING = buildWorldBriefing();

/** Call the same-origin server proxy. Returns { ok, text } or { ok:false, error } — never throws. */
export async function callLlm(question: string, history: ChatMessage[] = []): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!LLM_CONFIG.hasKey) return { ok: false, error: "no key configured" };
  const messages: ChatMessage[] = [
    { role: "system", content: WORLD_BRIEFING },
    ...history.slice(-6),
    { role: "user", content: question },
  ];
  try {
    // Relative, same-origin URL. No key, no third-party host, no provider path in this bundle.
    const r = await fetch(LLM_CONFIG.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, model: LLM_CONFIG.model }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { ok: false, error: `proxy ${r.status}` };
    const body = await r.json();
    const text: unknown = body?.text;
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: body?.error ?? "empty model response" };
    return { ok: true, text: text.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}
