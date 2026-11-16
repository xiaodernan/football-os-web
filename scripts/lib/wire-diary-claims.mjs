// M1175 · The Wire Diary — fold-claim verifier.
// The model speaks; this file proves every checkable claim against the committed OpenFootball CC0 fold.
// Any drift refuses the diary before it enters the tree — honest exits, no invented numbers.
// Deterministic and offline: proofs run it on every battery; the release script runs it before writing.

const ORDINAL_WORDS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20,
};

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};

const iso = (d) => String(d).slice(0, 10);
const MONTH_RE = new RegExp(String.raw`(\d{1,2}) (${Object.keys(MONTHS).join("|")}) (\d{4})`, "gi");
const SCORE_RE = /(\d+)\s*[-–—]\s*(\d+)/g;
const OF_RE = /(\d+)\s+of\s+(\d+)/g;
const TOTAL_RE = /(?:total of|total)\s+(\d+)/gi;
const MATCHDAY_RE = /matchday\s+(\d+)/gi;
const WINS_RE = /(\d+)\s+wins?\b/gi;
const POINTS_RE = /(\d+)\s+points?\b/gi;
const ORDINAL_SUFFIX_RE = /(\d{1,2})(st|nd|rd|th)\b/gi;

export function verifyArticleClaims(article, league) {
  const violations = [];
  const text = article.paragraphs.join(" \n");
  const clubs = new Set();
  for (const r of league.table) clubs.add(r.team);
  for (const f of league.seasonFixtures ?? []) { clubs.add(f.home); clubs.add(f.away); }
  for (const m of league.recent ?? []) { clubs.add(m.home); clubs.add(m.away); }
  for (const m of league.upcoming ?? []) { clubs.add(m.home); clubs.add(m.away); }

  const posByTeam = new Map(league.table.map((r) => [r.team, r.pos]));
  const wonByTeam = new Map(league.table.map((r) => [r.team, r.won]));
  const ptsByTeam = new Map(league.table.map((r) => [r.team, r.pts]));
  const fixtures = (league.seasonFixtures ?? []).filter((f) => Array.isArray(f.ft));

  // ISO dates and season labels are not scorelines — mask them with same-length blanks first
  // so the score scan keeps offsets intact while never seeing "2026-09-18" or "2026-8…".
  const masked = text.replace(/\d{4}-\d{2}-\d{2}/g, "          ");

  // helper — sentences with their absolute offsets in the text
  const sentenceSpans = (() => {
    const spans = [];
    const re = /[^.!?\n]+[.!?\n]+\s*/g;
    let m;
    while ((m = re.exec(text))) spans.push({ start: m.index, end: re.lastIndex, body: m[0] });
    if (spans.length === 0) spans.push({ start: 0, end: text.length, body: text });
    return spans;
  })();
  const sentenceAt = (at) => sentenceSpans.find((sp) => at >= sp.start && at < sp.end) ?? sentenceSpans[sentenceSpans.length - 1];

  // R4c · per-league played claim in the opening paragraph ("played 36 fixtures", "with 50 played")
  for (const m of text.matchAll(new RegExp(String.raw`(\d+)\s+(?:of ${league.totalFixtures}\s+)?(?:matches|fixtures|games)\s+(?:played|recorded|folded)`, "gi"))) {
    if (Number(m[1]) !== league.playedFixtures) violations.push(`"${m[0]}" contradicts the fold (${league.playedFixtures} played)`);
  }

  // R5 · cross-league club-name intrusion (handled at the call site, which owns the artifact)

  // R4 · every "N of M" claim equals the league's played/total
  for (const m of text.matchAll(OF_RE)) {
    const n = Number(m[1]), M = Number(m[2]);
    if (n !== league.playedFixtures || M !== league.totalFixtures) {
      violations.push(`"${m[0]}" contradicts the fold (${league.playedFixtures} of ${league.totalFixtures})`);
    }
  }
  // "…total of N…" / "…recorded N of…" style single totals
  for (const m of text.matchAll(TOTAL_RE)) {
    if (Number(m[1]) !== league.totalFixtures) violations.push(`"${m[0]}" contradicts the fold (total ${league.totalFixtures})`);
  }

  // R2 · every named date equals a fixture date in this league
  for (const m of text.matchAll(/\d{4}-\d{2}-\d{2}/g)) {
    if (!fixtures.some((f) => iso(f.date) === m[0])) violations.push(`date ${m[0]} appears in no fixture on the fold`);
  }

  for (const m of text.matchAll(MONTH_RE)) {
    const day = Number(m[1]), month = MONTHS[m[2].toLowerCase()], year = Number(m[3]);
    if (!month) continue;
    const wanted = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!fixtures.some((f) => iso(f.date) === wanted)) {
      violations.push(`date ${wanted} appears in no fixture on the fold`);
    }
  }

  // R3 · every scoreline matches a fixture of this league by unordered club pair and goal multiset
  for (const m of masked.matchAll(SCORE_RE)) {
    const a = Number(m[1]), b = Number(m[2]);
    const start = m.index ?? 0;
    // scope the club search to the sentence carrying the scoreline — never across paragraph/sentence boundaries
    const span = sentenceAt(start);
    const offset = start - span.start;
    const mentioned = [...clubs].map((c) => ({ c, at: span.body.indexOf(c) })).filter((x) => x.at >= 0 && x.at < offset + 5).sort((x, y) => x.at - y.at);
    const sortedScores = [a, b].slice().sort((x, y) => x - y);
    const sortedFt = (f) => [f.ft[0], f.ft[1]].slice().sort((x, y) => x - y);
    const anyOrder = fixtures.find((f) => JSON.stringify(sortedFt(f)) === JSON.stringify(sortedScores));
    if (mentioned.length >= 2) {
      const h = mentioned[0].c, aw = mentioned[1].c;
      const pair = fixtures.find((f) =>
        ((f.home === h && f.away === aw) || (f.home === aw && f.away === h)) &&
        JSON.stringify(sortedFt(f)) === JSON.stringify(sortedScores));
      if (!pair) violations.push(`score ${a}-${b} does not match the fixture ${h} v ${aw} on the fold`);
    } else if (!anyOrder) {
      violations.push(`score ${a}-${b} is not any committed fixture of this league`);
    }
  }

  // R2b · "Matchday N" exists in this league's rounds
  const matchdays = new Set((league.seasonFixtures ?? []).map((f) => Number(/(\d+)\s*$/.exec(f.round ?? "")?.[1] ?? NaN)).filter(Number.isFinite));
  for (const m of text.matchAll(MATCHDAY_RE)) if (!matchdays.has(Number(m[1]))) violations.push(`"Matchday ${m[1]}" is not a round on the fold`);

  // Paragraph windows: attribution happens per paragraph — a clause can reference any club the
  // paragraph itself names, but a figure no named club carries is refused wherever it lands.
  const paraWindows = [];
  {
    let at = 0;
    for (const p of article.paragraphs ?? []) { paraWindows.push({ start: at, end: at + p.length }); at += p.length + 1; }
  }
  const paraIndexAt = (atAbs) => paraWindows.findIndex((w) => atAbs >= w.start && atAbs < w.end);
  const windowClubsAt = (atAbs) => {
    const i = paraIndexAt(atAbs);
    const para = (article.paragraphs ?? [])[i] ?? text;
    const rel = Math.max(0, atAbs - (paraWindows[i]?.start ?? 0));
    return [...clubs].filter((c) => para.lastIndexOf(c, rel) >= 0);
  };

  // R6 · every "N wins" / "N points" — refused only when NO club named earlier in the same paragraph carries it
  for (const { re, map, label } of [{ re: WINS_RE, map: wonByTeam, label: "wins" }, { re: POINTS_RE, map: ptsByTeam, label: "points" }]) {
    for (const m of text.matchAll(re)) {
      const n = Number(m[1]);
      const windowClubs = windowClubsAt(m.index ?? 0);
      if (windowClubs.some((c) => map.get(c) === n)) continue; // some named club carries the number — the reference is decidable, not false
      if (windowClubs.length === 0) {
        // the claim names no club at all — an anaphoric table reference ("the three clubs level on 13 points");
        // it stands or falls on whether ANY club in the league carries the figure
        if ([...map.values()].includes(n)) continue;
        violations.push(`${n} ${label} claimed with no named clubs around it; no club in this league carries it`);
        continue;
      }
      const before = text.slice(0, m.index ?? 0);
      const prior = [...clubs].map((c) => ({ c, at: before.lastIndexOf(c) })).filter((x) => x.at >= 0).sort((x, y) => y.at - x.at)[0];
      const at = m.index ?? 0;
      const snippet = text.slice(Math.max(0, at - 140), Math.min(text.length, at + 40)).replace(/\n/g, " ");
      violations.push(`${n} ${label} claimed; no club named earlier in the paragraph carries it (nearest: ${prior?.c ?? "no club"}) — in: "…${snippet}…"`);
    }
  }

  // R7 · bare ordinals ("were listed second", "… 17th") attach to the nearest preceding club
  const ordinalHits = [...text.matchAll(ORDINAL_SUFFIX_RE)];
  const looseOrdinalRe = new RegExp(String.raw`(${Object.keys(ORDINAL_WORDS).join("|")})\b`, "gi");
  const ordinalClaims = [];
  for (const m of ordinalHits) ordinalClaims.push({ at: m.index ?? 0, len: m[0].length, pos: Number(m[1]) });
  for (const m of text.matchAll(looseOrdinalRe)) {
    // only accept word-ordinals when preceded by "listed" / "were" / "was" / "stands" / "are" within 60 chars — avoid false positives on "sixth-form" etc.
    const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index);
    if (/listed|were|was|are|is|stand|stands|sits|sit|placed/i.test(before)) ordinalClaims.push({ at: m.index ?? 0, len: m[0].length, pos: ORDINAL_WORDS[m[1].toLowerCase()] });
  }
  const prefixPositional = (at) => {
    // "Nth-placed X" (or "second-placed X") binds the ordinal to the club named right after it
    const after = text.slice(at, at + 120);
    const m = after.match(/^(st|nd|rd|th)?-?placed\s+/i);
    if (!m) return null;
    const tail = after.slice(m[0].length);
    const named = [...clubs].map((c) => ({ c, at: tail.indexOf(c) })).filter((x) => x.at >= 0 && x.at < 80).sort((x, y) => x.at - y.at)[0];
    return named ? { club: named.c, pos: posByTeam.get(named.c) } : null;
  };

  for (const c of ordinalClaims) {
    const pref = prefixPositional(c.at + c.len);
    if (pref) {
      if (pref.pos !== c.pos) violations.push(`"${c.pos}-placed ${pref.club}" — the fold lists that club at position ${pref.pos}`);
      continue; // prefix-positional claims bind forward, never to the nearest preceding club
    }
    const windowClubs = windowClubsAt(c.at);
    if (windowClubs.some((name) => posByTeam.get(name) === c.pos)) continue; // a club the paragraph names sits there — not a false claim
    const before = text.slice(0, c.at);
    const prior = [...clubs].map((name) => ({ name, at: before.lastIndexOf(name) })).filter((x) => x.at >= 0).sort((x, y) => y.at - x.at)[0];
    const truthList = windowClubs.map((name) => `${name} ${posByTeam.get(name)}`).join(", ");
    const snippet = text.slice(Math.max(0, c.at - 140), Math.min(text.length, c.at + 40)).replace(/\n/g, " ");
    violations.push(`position ${c.pos} claimed; no club named earlier in the paragraph sits there (window: [${truthList}], nearest: ${prior?.name ?? "no club"}) — in: "…${snippet}…"`);
  }

  // R5b · in paragraph 0, clubs that appear must appear in non-decreasing table position order
  const p0 = (article.paragraphs?.[0] ?? "");
  let last = 0;
  for (const name of [...clubs].sort((a, b) => p0.indexOf(a) - p0.indexOf(b))) {
    const at = p0.indexOf(name);
    if (at < 0) continue;
    const pos = posByTeam.get(name);
    if (pos !== undefined) {
      if (pos < last) violations.push(`paragraph 1 lists ${name} (pos ${pos}) before an earlier-positioned club — table order is not respected`);
      else last = pos;
    }
  }

  return violations;
}

export function verifyDiaryAgainstFold(diaryPayload, liveWireArtifact) {
  const problems = [];
  if (!diaryPayload || !Array.isArray(diaryPayload.diary)) return ["the diary payload carries no articles array"];
  const leagues = new Map(liveWireArtifact.leagues.map((l) => [l.id, l]));
  for (const article of diaryPayload.diary) {
    const league = leagues.get(article.leagueId);
    if (!league) { problems.push(`${article.leagueId ?? "?"}: league not on the fold`); continue; }
    for (const v of verifyArticleClaims(article, league)) problems.push(`${article.leagueId}: ${v}`);
    // cross-league contamination: names a club belonging to a different league but never this one
    const thisLeague = new Set();
    for (const r of league.table) thisLeague.add(r.team);
    for (const f of league.seasonFixtures ?? []) { thisLeague.add(f.home); thisLeague.add(f.away); }
    const foreign = [];
    for (const other of liveWireArtifact.leagues) {
      if (other.id === league.id) continue;
      const foreignClubs = new Set();
      for (const r of other.table) foreignClubs.add(r.team);
      for (const f of other.seasonFixtures ?? []) { foreignClubs.add(f.home); foreignClubs.add(f.away); }
      const text = article.paragraphs.join(" ");
      for (const c of foreignClubs) if (!thisLeague.has(c) && text.includes(c)) foreign.push(`${c} (${other.id})`);
    }
    if (foreign.length) problems.push(`${article.leagueId}: names foreign clubs not of this league — ${[...new Set(foreign)].join(", ")}`);
  }
  return problems;
}
