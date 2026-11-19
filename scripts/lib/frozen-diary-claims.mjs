// M1201 · The Frozen Diary — fold-claim verifier.
// The model speaks; this file proves every checkable claim against the frozen fold artifact.
// Any drift refuses the diary before it enters the tree — honest exits, no invented numbers.
// Deterministic and offline: proofs run it on every battery; the release script runs it first.

/** Every numeral the fold carries, verbatim and rounded — the same law the ask desks obey. */
export const foldNumerals = (fold) => {
  const out = new Set();
  const walk = (v) => {
    if (v === null || v === undefined) return;
    if (typeof v === "number") {
      out.add(String(v));
      out.add(String(Math.round(v)));
      return;
    }
    if (Array.isArray(v)) { for (const item of v) walk(item); return; }
    if (typeof v === "object") { for (const sub of Object.values(v)) walk(sub); return; }
    for (const m of String(v).matchAll(/\d+(?:[\d.,]*\d)?/g)) {
      const raw = m[0].replace(/,/g, "");
      out.add(raw);
      out.add(String(Math.round(Number(raw))));
    }
  };
  walk(fold);
  return out;
};

export function verifyDiaryClaims(payload, foldPayload) {
  const problems = [];
  if (!payload || !Array.isArray(payload.diary)) return ["the diary payload carries no articles array"];
  const byId = new Map((foldPayload?.folds ?? []).map((f) => [f.id, f]));

  for (const article of payload.diary) {
    const fold = byId.get(article.competitionId);
    if (!fold) { problems.push(`${article.competitionId ?? "?"}: competition not on the frozen fold`); continue; }
    const text = (article.paragraphs ?? []).join(" ");
    const allowed = foldNumerals(fold);
    // any numeral that is not single digit and not on the fold is drift
    for (const m of text.matchAll(/\d+(?:[\d.,]*\d)?/g)) {
      const raw = m[0].replace(/,/g, "");
      if (raw.length === 1) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      if (!allowed.has(raw) && !allowed.has(String(Math.round(n)))) {
        problems.push(`${fold.id}: numeral ${raw} appears nowhere in the frozen fold`);
      }
    }
    // futurology is unforgeable timber; the diary stays in the past tense of the frozen season
    if (/\b(will|won't|never will|by the time|years from now|listen to me)\b/i.test(text)) {
      problems.push(`${fold.id}: futurology refused`);
    }
  }
  return problems;
}
