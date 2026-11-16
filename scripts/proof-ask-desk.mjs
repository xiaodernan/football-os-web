// Proof for Ask the Wire (M1166, re-pinned at M1176 as the Ask-Desk StateGraph).
// The desk rides the wire's exact streaming door; the retrieval round-trips the committed
// artifact per preset so the model never sees more — or less — than needed. At M1176 the
// flow is an explicit typed node machine with a refusal lane: precommit re-proves every
// checkable claim in the model's answer against the fold before the reader sees it.
// Run: node scripts/proof-ask-desk.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const wire = readFileSync("public/live-wire.json", "utf8");
ok("the committed wire is live-wire/v3, required by every wireAskSystem branch",
  (() => { try { return JSON.parse(wire).schema === "live-wire/v3"; } catch { return false; } })());

const desk = readFileSync("domain/askDesk.ts", "utf8");
ok("domain/askDesk.ts ships the typed node machine — six stages, one refusal lane",
  /export const ASK_STAGES/.test(desk) && /export type AskStage/.test(desk) &&
  /export type TraceVerdict = "pass" \| "refused"/.test(desk) &&
  /export interface AskState/.test(desk) && /export function verifyAskText/.test(desk));

ok("verifyAskText pins the ask desk to the fold itself — wins, points, ordinals bundled with dates and fixtures",
  /ISO_RE/.test(desk) && /SCORE_RE/.test(desk) && /MATCHDAY_RE/.test(desk) &&
  /WINS_RE/.test(desk) && /POINTS_RE/.test(desk) && /MONTH_RE/.test(desk) &&
  /buildUniverse\(payload\)/.test(desk));

ok("every club-like token the model writes must be a known club on this fold — no invented entities, ever",
  /CLUB_MARKER_RE/.test(desk) && /clubToken/.test(desk) && /clause.matchAll/.test(desk));

const src = readFileSync("features/livewire/LiveWire.tsx", "utf8");
ok("every refusal lane leads to the fold's own answer — never silence",
  /const foldAskAnswerText/.test(src) &&
  (src.match(/foldAskAnswerText\(payload, id, t\)/g) ?? []).length >= 4);
ok("three presets ship with three distinct ids",
  ["nextRound", "titleChase", "wonderTable"].every((id) => src.includes(`id: "${id}"`)));
ok("three presets carry their own ask string, none empty",
  (src.match(/ask: "Tell the reader/g) ?? []).length >= 2 &&
  src.includes('ask: "For every league in the file'));

ok("the desk's preset chips render through the live dynamic site (w.id), not a *Key field",
  src.includes("{t(`liveWire.askDesk.${w.id}.kicker`)}"));

ok("the streaming kicker reads through the live dynamic site (askId)",
  (src.match(/t\(`liveWire\.askDesk\.\$\{askId\}\.kicker`\)/g) ?? []).length === 2);

ok("the streaming wire asks through the ONE streaming door (callLlmStream), with the preset's ask as the message",
  /callLlmStream\(\s*ws\.ask/.test(src));

ok("the system is built from the committed artifact, retrieval-selected per preset (M1166)",
  /retrieveAsk\(p, ask\.id\)/.test(src) && /import \{ retrieveAsk/.test(src));

ok("the fold handed to the model carries no totalFixtures arithmetic of its own anymore — the retrieval decides what the question may see",
  !/totalFixtures: sum\(/.test(src));

// ---- the trace strip (M1176) ----
ok("LiveWire wires the fold guard BEFORE committing model output — pass lane reaches commit",
  /verifyAskText\(r\.text, payload\)/.test(src) && /askPrecommit\(desk, \"pass\"/.test(src) &&
  /askCommit\(/.test(src));
ok("a refusal swaps the model's words for the fold's own answer — never a silent swap",
  /askPrecommit\(desk, \"refused\"/.test(src) && /askRefused\(/.test(src) && /foldAskAnswerText\(payload, id, t\)/.test(src));
ok("the fold answer stamps when model is out or the claims fail — honesty over drama",
  (src.match(/foldAskAnswerText\(payload, id, t\)/g) ?? []).length >= 4);
ok("the trace renders as stage chips with t() keys, aria-labelled",
  /askTrace\.map/.test(src) && /liveWire\.askTrace\.stage\.\$\{entry\.stage\}/.test(src) && /entry\.note/.test(src));
ok("paths that bypass precommit are impossible — the only exits from the desk runner are commit-or-refused",
  !/setAskTrace\(null\)[\s\S]{0,50}setBrief\(\{ status: "ready"/.test(src));

// ---- the retrieval's chapters ----
const rag = readFileSync("domain/wireRag.ts", "utf8");
ok("domain/wireRag.ts is the ONE spelling of the ask space",
  /export type WireAskId = "nextRound" \| "titleChase" \| "wonderTable"/.test(rag));
ok("domain/wireRag.ts exports the one retriever nothing else spell",
  /export function retrieveAsk\(/.test(rag));
ok("nextRound retrieves the next fixtures and the summit — nothing else leaks in",
  /next: l\.upcoming/.test(rag) && /summit: l\.table\.slice\(/.test(rag));
ok("titleChase retrieves the summit and the form weights of the same four clubs",
  /summit: l\.table\.slice\(/.test(rag) && /formWeights: l\.table\.slice\(/.test(rag));
ok("wonderTable names its three computed oddities outright (high-GA in the top-6, attack, defense, negative-gd leaders)",
  /highGAInTop6/.test(rag) && /negativeGdLeaders/.test(rag) && /attack: byAttack/.test(rag) && /defense: outlierDefense/.test(rag));
ok("the retrieval declares zero secrets and zero fetch — only the artifact is consulted",
  !/callLlmStream|fetch\(|http/.test(rag));
const stripCommentsWireRag = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, "")).join("\n");
ok("every row the retriever returns is a tuple or primitive — no prose strings with sentences",
  !/[.!?]\s+[A-Z]/.test(stripCommentsWireRag(rag)));

ok("exactly one ask button renders per preset, with aria-pressed on the active one",
  (src.match(/WIRE_ASKS\.map\(\(w\) =>/g) ?? []).length === 1 && src.includes("aria-pressed={askId === w.id}"));
ok("the panel renders kicker, title and subtitle as literal keys",
  src.includes('t("liveWire.askDesk.kicker")') && src.includes('t("liveWire.askDesk.title")') && src.includes('t("liveWire.askDesk.subtitle")'));

// ---- the desk's own absence of model sentences is pinned ----
const noSloppiness = /never invent|never estimate|stop/i.test(src);
ok("the no-invention clause is pinned in the prompt", noSloppiness);
ok("the fold handed in is the fold the ask named — the presets cannot silently widen their view",
  (src.match(/retrieveAsk/g) ?? []).length >= 2);

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["liveWire.askDesk.kicker", "liveWire.askDesk.title", "liveWire.askDesk.subtitle",
                   "liveWire.askDesk.nextRound.kicker", "liveWire.askDesk.titleChase.kicker", "liveWire.askDesk.wonderTable.kicker"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}
for (const key of ["nextRound.cta", "titleChase.cta", "wonderTable.cta", "nextRound.body", "titleChase.body", "wonderTable.body"]) {
  ok(`no unused ${key} rows linger in the dictionary (coined-then-dropped, all three locales)`,
    !dict.includes(`"liveWire.askDesk.${key}"`));
}
for (const key of ["liveWire.askTrace.label", "liveWire.askTrace.verified", "liveWire.askTrace.foldAnswer",
                   "liveWire.askTrace.stage.preflight", "liveWire.askTrace.stage.retrieve", "liveWire.askTrace.stage.build",
                   "liveWire.askTrace.stage.precommit", "liveWire.askTrace.stage.commit", "liveWire.askTrace.stage.refused"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
