// M1201 · The Frozen Diary — one honest article per competition, written by the model,
// sealed to the frozen fold on every numeral. 15 imprisoned openings; drift and the fold
// writes the paragraph instead (by:"fold"), honestly labelled; no invented figure ever ships.
// Never edit public/frozen-diary.json by hand; regenerate with the Clash proxy armed.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ProxyAgent, fetch as proxyFetch } from "undici";
import { verifyDiaryClaims, foldNumerals } from "./lib/frozen-diary-claims.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const foldFile = resolve(root, "public/frozen-fold.json");
const outFile = resolve(root, "public/frozen-diary.json");

const foldPayload = JSON.parse(readFileSync(foldFile, "utf8"));

// server-only config — the diary is written on a build machine, never in a browser session
const env = { ...process.env };
const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !Object.prototype.hasOwnProperty.call(env, m[1])) env[m[1]] = m[2];
  }
}
const key = env.LLM_API_KEY || "";
const baseUrl = String(env.LLM_BASE_URL || "https://api.aizzz.xyz/v1").replace(/\/+$/, "").replace(/\/v1$/i, "") + "/v1";
const model = env.LLM_MODEL || "gpt-6.2-sol";
const upstreamRaw = (env.LLM_UPSTREAM_PROXY || "").trim();
const dispatcher = upstreamRaw ? new ProxyAgent(upstreamRaw) : undefined;

const callModel = async (system, user) => {
  const r = await proxyFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 450,
      temperature: 0.5,
      stream: false,
      prompt_cache_key: `football-os-web:diary-perfold:${String(model)}`,
      prompt_cache_retention: "24h",
    }),
    dispatcher,
  });
  if (!r.ok) return { ok: false, error: `model_${r.status}` };
  const j = await r.json().catch(() => null);
  const text = String(j?.choices?.[0]?.message?.content ?? "").trim();
  return text.length > 0 ? { ok: true, text } : { ok: false, error: "empty_model_response" };
};

const systemPrompt = [
  "You are the Frozen Diaries of Football OS — the seeded world's own newspaper.",
  "Write ONE paragraph in the visitor's language about this competition's season so far.",
  "Speak ONLY from THE ENVELOPE you are given. Every numeral must appear in it verbatim.",
  "No future tense. No invented result. This is a frozen snapshot: nothing is predicted.",
  "Keep it under 90 words. Plain prose, no lists, no headers, no calls to action.",
].join("\n");

const foldSummary = (f) => [
  `${f.name} (${f.nation}, tier ${f.tier}).`,
  `${f.clubs} clubs; ${f.played} played of ${f.totalMatches} fixtures (${f.finishedMatches} finished); ${f.goals} goals folded so far.`,
  `Leader: ${f.champions.club} — ${f.champions.pts} pts (${f.champions.won}W ${f.champions.drawn}D ${f.champions.lost}L, gd ${f.champions.gd}).`,
  `Chaser: ${f.runnerUp.club} — ${f.runnerUp.pts} pts (${f.runnerUp.played} pl, gd ${f.runnerUp.gd}).`,
  `Tail: ${f.tail.club} — ${f.tail.pts} pts (${f.tail.played} pl).`,
  `Table (pos, club, played, won, drawn, lost, gf, ga, gd, pts):`,
  ...f.table.map((row) => `  ${row.join(" | ")}`),
].join("\n");

const foldFallback = (f) => (
  `The fold shows ${f.champions.club} ahead of the frozen season on ${f.champions.pts} points from ${f.champions.played} played — ` +
  `${f.champions.won} wins against ${f.champions.drawn} drawn and ${f.champions.lost} lost, ${f.goals} goals across ${f.finishedMatches} played fixtures in ${f.nation}. ` +
  `${f.runnerUp.club} chase at ${f.runnerUp.pts}. The table is the only verdict that matters here.`
);

mkdirSync(dirname(outFile), { recursive: true });

const diary = [];
const wanted = foldPayload.folds.length;
for (const fold of foldPayload.folds) {
  process.stdout.write(`frozen diary: ${fold.id} ... `);
  const sys = `${systemPrompt}`;
  const user = foldSummary(fold);
  const modelUsed = key !== "";
  if (!modelUsed) {
    console.log("fold (no key)");
    diary.push({ competitionId: fold.id, competition: fold.name, nation: fold.nation, tier: fold.tier, paragraphs: [foldFallback(fold)], by: "fold" });
    continue;
  }
  const result = await callModel(sys, user);
  if (result.ok) {
    const candidate = { paragraphs: [result.text] };
    const violations = verifyDiaryClaims({ diary: [{ competitionId: fold.id, paragraphs: [result.text] }] }, { folds: [fold] });
    if (violations.length === 0) {
      console.log("model ok");
      diary.push({ competitionId: fold.id, competition: fold.name, nation: fold.nation, tier: fold.tier, paragraphs: [result.text], by: "model" });
    } else {
      console.log(`refused (${violations.length} drift) — fold written instead`);
      diary.push({ competitionId: fold.id, competition: fold.name, nation: fold.nation, tier: fold.tier, paragraphs: [foldFallback(fold)], by: "fold" });
    }
  } else {
    console.log(`refused (${result.error}) — fold written instead`);
    diary.push({ competitionId: fold.id, competition: fold.name, nation: fold.nation, tier: fold.tier, paragraphs: [foldFallback(fold)], by: "fold" });
  }
}

const payload = {
  version: "frozen-diary/v1",
  generatedAt: new Date().toISOString(),
  diary,
  summary: { competitionsFrozen: diary.length, byModel: diary.filter((d) => d.by === "model").length, byFold: diary.filter((d) => d.by === "fold").length },
  by: diary.every((d) => d.by === "model") ? "model" : "mixed",
};
const check = verifyDiaryClaims(payload, foldPayload);
if (check.length > 0) {
  console.error("frozen-diary refused before writing:", check.join(" | "));
  process.exit(1);
}
writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`frozen diary sealed: ${diary.length}/${wanted} competitions · by:${payload.by} (${payload.summary.byModel} model · ${payload.summary.byFold} fold)`);
process.exit(0);
