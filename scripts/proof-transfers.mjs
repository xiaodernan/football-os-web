// Proof for domain/transfers.ts — the model behind the Transfer Centre board.
//
// Its header makes three promises that a one-line edit can break silently: every
// row is grounded in a REAL news article (with that article's own source and
// credibility), every money figure is a transparent formula over the player's
// stored market value, and the "fit" score reads the VIEWER CLUB's own squad
// depth. This last one is the surface onboarding points at when it promises
// recommendations personalised to your club (M140), so it is not decoration.
//
// Rather than freeze a shortlist (the seeded feed changes with the world seed),
// this recomputes every derived field from the dataset it reads and replays the
// documented formulas, then checks the filter/sort/grounding rules on all 39
// clubs. Run: node scripts/proof-transfers.mjs
import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { transferRumours, askingFee, availableKinds, clubOf } = await server.ssrLoadModule("/domain/transfers.ts");
const { bucketOf, headroom, valueIndex, squadProfile } = await server.ssrLoadModule("/domain/scouting.ts");
const { newsFeed, getNews, getPlayer, getClub, footballProvider } = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fitFormula = (myAvg, head, overall) => clamp(Math.round(50 + (70 - myAvg) * 3 + head * 1.2 + (overall - 60)), 5, 99);

// --- askingFee: the transparent 1.1x estimate --------------------------------
ok("askingFee = value rounded to the nearest €100k after a 1.1x uplift", askingFee(1_000_000) === 1_100_000);
ok("askingFee(0) is 0, not a phantom fee", askingFee(0) === 0);
// 950k x1.1 = 1.045M and 1.45M x1.1 = 1.595M: neither lands on the grid, so these
// two pin the rounding direction rather than the uplift.
ok("askingFee snaps to the nearest €100k (1.045M→1.0M, 1.595M→1.6M)", askingFee(950_000) === 1_000_000 && askingFee(1_450_000) === 1_600_000);
const values = footballProvider.players().map((p) => p.value);
ok("every real fee is a positive multiple of €100k", values.every((v) => askingFee(v) % 100_000 === 0 && askingFee(v) >= 0));
ok("fee never undercuts the stored market value", values.every((v) => askingFee(v) >= v));
ok("askingFee is monotone in value", values.slice().sort((a, b) => a - b).every((v, i, s) => i === 0 || askingFee(v) >= askingFee(s[i - 1])));

// --- the board's own vocabulary ---------------------------------------------
ok("availableKinds is the three reportable story types", JSON.stringify(availableKinds()) === JSON.stringify(["Rumor", "Reported", "Confirmed"]));

const feedSnapshot = JSON.stringify(newsFeed);
const board = transferRumours();
ok("building the board never mutates the news feed", JSON.stringify(newsFeed) === feedSnapshot);
ok("the board is non-empty (the gate below is not vacuous)", board.length > 0);
ok("the board is deterministic", JSON.stringify(transferRumours()) === JSON.stringify(board));

// --- grounding: every row traces to a real article ---------------------------
ok("every row's article exists and its kind is one of the rumour kinds",
  board.every((r) => { const n = getNews(r.articleId); return !!n && availableKinds().includes(n.kind); }));
ok("row metadata is the ARTICLE's own fields, copied not invented",
  board.every((r) => { const n = getNews(r.articleId); return n.title === r.title && n.kind === r.kind && n.source === r.source && n.credibility === r.credibility && n.publishedAt === r.publishedAt; }));
ok("the player named by a row is really referenced by that article",
  board.every((r) => getNews(r.articleId).entityIds.includes(r.playerId)));
// "First resolvable entity wins" is NOT a falsifiable claim on this dataset —
// each article names at most one player, so first == only (a mutation to
// `.slice(-1)` passed green). Pin the fact that makes the pick unambiguous
// instead, so an article that ever names two players turns this red and forces
// the ambiguity decision rather than silently ranking one of them.
ok("no rumour article names more than one player (the board's pick is unambiguous)",
  newsFeed.filter((n) => availableKinds().includes(n.kind)).every((n) => n.entityIds.filter((id) => !!getPlayer(id)).length <= 1));
ok("the row's player is a player that article actually names",
  board.every((r) => getNews(r.articleId).entityIds.filter((id) => !!getPlayer(id)).includes(r.playerId)));
ok("no row is invented from an article that names no player",
  newsFeed.filter((n) => availableKinds().includes(n.kind) && !n.entityIds.some((id) => getPlayer(id))).every((n) => !board.some((r) => r.articleId === n.id)));
const expectedRows = newsFeed.filter((n) => availableKinds().includes(n.kind) && n.entityIds.some((id) => getPlayer(id))).length;
ok("every eligible article produces exactly one row", board.length === expectedRows);

// --- player fields come from the dataset, not a guess ------------------------
ok("row player fields equal the stored player record",
  board.every((r) => { const p = getPlayer(r.playerId); return p.name === r.playerName && p.position === r.position && p.age === r.age && p.clubId === r.fromClubId; }));
ok("fromClubName is the real club name", board.every((r) => getClub(r.fromClubId)?.name === r.fromClubName));
ok("the club-id fallback in fromClubName is unreachable on the shipped dataset (no orphan players)",
  footballProvider.players().every((p) => !!getClub(p.clubId)));
ok("row money/index/headroom are recomputable from the stored player",
  board.every((r) => { const p = getPlayer(r.playerId); return r.askingFee === askingFee(p.value) && r.headroom === headroom(p) && r.valueIndex === Math.round(valueIndex(p) * 10) / 10; }));
ok("headroom is never negative", board.every((r) => r.headroom >= 0));
ok("credibility stays in the 0..1 band the article stores", board.every((r) => r.credibility >= 0 && r.credibility <= 1));

// --- without a viewer club there is no fit claim at all ----------------------
ok("no viewer → every fitScore is null (the board invents no need)", board.every((r) => r.fitScore === null));
ok("no viewer → nothing is flagged as a target", board.every((r) => !r.isTarget));
ok("no viewer → the order is credibility then recency",
  board.every((r, i) => i === 0 || board[i - 1].credibility > r.credibility || (board[i - 1].credibility === r.credibility && board[i - 1].publishedAt >= r.publishedAt)));

// --- with a viewer club: fit reads THAT club's squad, own players are excluded
const clubs = footballProvider.clubs();
const withViewer = clubs.map((c) => ({ club: c, rows: transferRumours(c.id) }));
ok("a viewer never sees its own players as targets",
  withViewer.every(({ club, rows }) => rows.every((r) => r.fromClubId !== club.id)));
ok("a viewer's board is never longer than the neutral one",
  withViewer.every(({ rows }) => rows.length <= board.length));
for (const { club, rows } of withViewer.slice(0, 8)) {
  const avg = new Map(squadProfile(club.id).map((s) => [s.bucket, s.avg]));
  const label = club.id + " (" + rows.length + ")";
  ok("fitScore is the documented squad-need formula · " + label,
    rows.every((r) => { const p = getPlayer(r.playerId); return r.fitScore === fitFormula(avg.get(bucketOf(p.positionGroup)), headroom(p), p.overall); }));
  ok("isTarget is exactly fit >= 70 · " + label, rows.every((r) => r.isTarget === (r.fitScore >= 70)));
  ok("fit is bounded to the 5..99 band it claims · " + label, rows.every((r) => r.fitScore >= 5 && r.fitScore <= 99));
  ok("rows stay sorted fit desc → credibility desc → recency desc · " + label,
    rows.every((r, i) => i === 0 || (() => {
      const a = rows[i - 1], b = r;
      const af = a.fitScore ?? -1, bf = b.fitScore ?? -1;
      return af > bf || (af === bf && (a.credibility > b.credibility || (a.credibility === b.credibility && a.publishedAt >= b.publishedAt)));
    })()));
}
// squadProfile always answers for all four buckets, so fitFor's "unknown bucket"
// branch (which would return 0, below the clamp floor) cannot fire from this UI.
ok("squadProfile reports every bucket, so a viewer always gets a real average",
  clubs.every((c) => { const s = squadProfile(c.id); return s.length === 4 && ["GK", "DEF", "MID", "ATT"].every((b) => s.some((x) => x.bucket === b)); }));
// An empty bucket averages 0, and the formula reads that as maximum need — so a
// club with nobody in a bucket should score every target there at the 99 ceiling.
const thin = withViewer.find(({ club }) => squadProfile(club.id).some((s) => s.count === 0));
ok("a club with an empty squad bucket exists to test the ceiling (gate is not vacuous)", !!thin);
ok("every target in that empty bucket scores the 99 ceiling",
  !!thin && thin.rows.filter((r) => squadProfile(thin.club.id).find((s) => s.bucket === bucketOf(getPlayer(r.playerId).positionGroup)).count === 0)
    .every((r) => r.fitScore === 99 && r.isTarget));
ok("at least one viewer genuinely has a priority target, so the badge is reachable",
  withViewer.some(({ rows }) => rows.some((r) => r.isTarget)));
ok("choosing a different club can change the ranking (fit is really viewer-scoped)",
  new Set(withViewer.slice(0, 8).map(({ rows }) => rows.slice(0, 3).map((r) => r.articleId).join("|"))).size > 1);
ok("viewer boards are deterministic per club", withViewer.every(({ club }) => JSON.stringify(transferRumours(club.id)) === JSON.stringify(transferRumours(club.id))));

// --- kind filter -------------------------------------------------------------
ok("an empty kind set yields no rows", transferRumours(undefined, []).length === 0);
ok("a single kind yields only that kind", ["Rumor", "Reported", "Confirmed"].every((k) => {
  const only = transferRumours(undefined, [k]);
  return only.every((r) => r.kind === k) && only.length <= board.length;
}));
ok("the union of single-kind boards is the full board",
  ["Rumor", "Reported", "Confirmed"].reduce((n, k) => n + transferRumours(undefined, [k]).length, 0) === board.length);
ok("an opinion/analysis story is never a transfer row",
  board.every((r) => r.kind !== "Opinion" && r.kind !== "Analysis") &&
  newsFeed.some((n) => n.kind === "Opinion" || n.kind === "Analysis"));

// --- clubOf convenience ------------------------------------------------------
const anyPlayer = footballProvider.players()[0];
ok("clubOf resolves a real player to their club", clubOf(anyPlayer.id)?.id === anyPlayer.clubId);
ok("clubOf returns undefined for an unknown id", clubOf("nobody-here") === undefined);

console.log(`\n${board.length} neutral rows · ${clubs.length} viewer boards · ${newsFeed.length} articles scanned`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
