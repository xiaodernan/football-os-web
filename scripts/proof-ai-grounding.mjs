import { createServer } from "vite";
import { readFileSync } from "node:fs";

// Pins the AI grounding + honesty contract for the retrieval layer: the answer
// surface is the product's most sensitive claim (spec §44–§47) and until now had
// no runnable gate. This covers the two honesty fixes that a future edit could
// silently regress — M91 (never invent a decisive-player ranking) and M102 (a
// value question must surface the real listed figure, not degrade to a stub) —
// plus the always-grounded contract, the no-hits refusal, determinism, and the
// M106 removal of the write-only `retrieved` field from every answer.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { askIntelligence } = await server.ssrLoadModule("/data/intelligence.ts");
const { scoutReport } = await server.ssrLoadModule("/domain/scouting.ts");
const { footballProvider, formatValue, trendingPlayers } = await server.ssrLoadModule("/data/footballService.ts");
const { SEARCH_KINDS } = await server.ssrLoadModule("/domain/types.ts");
const { makeSay } = await import("./lib/rows.mjs");
const { asRowText, rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { say, locales, DICTIONARIES } = await makeSay(server);
// What the panel shows for one answer: the lead row and the fact rows after it, each
// resolved in English the way the screen resolves them for its reader.
const isRow = (x) => !!x && typeof x === "object" && ("key" in x || "value" in x);
// A module that goes back to composing English hands the panel a bare string; resolving
// that would throw, and a crashed proof proves nothing about which rule broke.
const getPlayerByName = (n) => footballProvider.players().find((p) => p.name === n);
const AT = (x) => x.answer.map((r) => (isRow(r) ? say("en")(r) : "⟨NOT A ROW⟩")).join(" ");

// M183: a source is a row now — `{kind, name}` — because the retrieval layer's own
// identifier (`club:mci`) is a code, and the panel used to print it to the visitor.
const sourceIs = (ans, kind, name) => {
  const s = ans.sources?.[0];
  return !!s && "key" in s && s.vars?.kind === kind && s.vars?.name === name;
};

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// One reader language for the checks that quote English prose, so an expectation cannot be
// met by a host accident. The M195 block at the end asks the same question in all three and
// refuses an answer whose rendered kickoff does not change with the reader.
const EN = "en";

// Fixtures are self-selected from the seeded world so the proof stays
// deterministic without hardcoding synthetic names: we take the first high-value
// player / club whose answer actually resolves to that entity as the top hit.
function valueFixture() {
  for (const p of trendingPlayers(40)) {
    const q = `How much is ${p.name} worth?`;
    const ans = askIntelligence(q, EN);
    if (sourceIs(ans, "player", p.name) && AT(ans).includes(formatValue(p.value))) return { p, q, ans };
  }
  return null;
}
function clubFixture() {
  for (const c of footballProvider.clubs()) {
    const q = `Who is the key player at ${c.name}?`;
    const ans = askIntelligence(q, EN);
    if (sourceIs(ans, "club", c.name) && /Based on the retrieved data about/.test(AT(ans))) return { c, q, ans };
  }
  return null;
}

// ---- M102: a player value question extracts the real currency figure ----
const vf = valueFixture();
ok("a high-value player resolves to a value answer", !!vf);
if (vf) {
  ok("value answer states the market-value lead", /current market value is/.test(AT(vf.ans)));
  ok("value answer embeds the exact listed figure", AT(vf.ans).includes(formatValue(vf.p.value)));
  ok("value answer carries a real € token", /€[\d.]+[MBK]?/.test(AT(vf.ans)));
  // Predicted from the records, not from whatever the answer happened to contain: the
  // three priciest players in the dataset, each asked by name, must each be answered with
  // that player's own listed figure. A hardcoded €-string cannot match three values, and
  // the regex-scraping this replaced could quietly satisfy one player out of four hundred.
  const rich = footballProvider.players().slice().sort((x, y) => y.value - x.value).slice(0, 3);
  const wrongLead = rich.filter((x) => {
    const a = askIntelligence(`How much is ${x.name} worth?`, EN);
    const lead = a.answer[0];
    return !lead || !("key" in lead) || lead.key !== "ai.answer.value" || lead.vars.v !== formatValue(x.value);
  });
  ok("each of the three most valuable players gets a value lead carrying that player's own listed figure (" + wrongLead.length + " wrong)",
    wrongLead.length === 0);
  // The M102 bug degraded every value answer to these stubs; assert neither returns.
  ok("value answer is NOT the 'not in the retrieved data' stub", !/not in the retrieved data/.test(AT(vf.ans)));
  ok("value answer is NOT the old 'sits at listed' stub", !/sits at listed/.test(AT(vf.ans)));
}

// ---- M91: a who/key question is grounded, never a fabricated ranking ----
const cf = clubFixture();
ok("a club who-question resolves to a grounded answer", !!cf);
if (cf) {
  ok("who answer uses the grounded 'retrieved data' framing", /Based on the retrieved data about/.test(AT(cf.ans)));
  ok("who answer does NOT invent a decisive-player ranking", !/most influential figure|stands out in/i.test(AT(cf.ans)));
  ok("who answer cites at least one retrieved fact", cf.ans.facts.length >= 1);
}

// ---- No-hits refusal: never invent when retrieval comes up empty ----
const none = askIntelligence("qqzz xxwv nonexistent fixture zzz 42711", EN);
ok("empty retrieval refuses to invent an answer", /will not invent/i.test(AT(none)));
ok("empty retrieval labels the demo provider", /Demo retrieval|no live model|API key/i.test(AT(none)));
ok("empty retrieval has no fabricated facts", none.facts.length === 0);
ok("empty retrieval confidence sits at the honest floor", none.confidence === 20);
// M324 companion: a populated retrieval returns real facts, so the "no fabricated facts" clause above has a population pin.
const grounded = [vf, cf].map((x) => x?.ans).filter(Boolean);
ok(`the empty answer's floors are floors: every grounded answer on this panel clears them (${grounded.length} grounded, confidence ${grounded.map((a) => a.confidence).join("/")} > 20, facts ${grounded.map((a) => a.facts.length).join("/")})`,
  grounded.length >= 2 && grounded.every((a) => a.confidence > 20 && a.facts.length >= 1));
// M314. The empty answer's two floors are only honest if the populated side clears them —
// otherwise `confidence === 20` could be a constant and `facts === 0` a retrieval that always
// comes back empty. The two grounded fixtures this file already built were measured before this
// was written: confidence 91 and 6 facts on both. The clause is self-guarded, so the vacuity
// census credits the two clauses above it through its companion window.

// ---- Every answer, not just the ones a fixture happened to pick ----
// Questions chosen to reach each retrievable kind: a club, a player, a competition, a
// fixture and a headline. Shape claims about answers are only worth anything if they walk
// all of them — the first version of these checks sat inside the value-answer branch and
// missed a composed fact in the club builder.
{
  const KINDS = [
    "Where do Arsenal sit in the Premier League?",
    "How much is Mbappé worth?",
    "Kickoff of the next fixture",
    "Any transfer news about Haaland?",
    "Real Madrid",
    "Who is the key player at Real Madrid?",
  ];
  const all = KINDS.map((q) => askIntelligence(q, EN));
  const answers = all.filter((a) => a.answer.length > 0);
  ok("every answer the panel could show is a non-empty list of rows", answers.length >= 4 && answers.every((a) => a.answer.every(isRow)));
  ok("and no answer is a lead alone — the facts it cites travel with it",
    answers.every((a) => a.answer.length >= 2));
  const facts = answers.flatMap((a) => a.facts);
  ok("every evidence line and chip in every answer is a row (" + facts.length + " lines)",
    facts.length >= 6 && facts.every((f) => isRow(f.text) && isRow(f.label)));
  const lines = facts.map((f) => (isRow(f.text) ? say("en")(f.text) : "⟨raw⟩"));
  ok("no evidence line reaches the reader as the module's own English (" + lines.filter((t) => t === "⟨raw⟩").length + " raw)",
    lines.every((t) => t !== "⟨raw⟩"));
  ok("and none of them leaks a key or an unfilled placeholder",
    !lines.some((t) => /\{\w+\}/.test(t) || /^(ai|dna|det|common)\.[a-z]/.test(t)));
// M324 companion: the evidence lines actually carry real row data (not just absence of keys), so the "no leaks" clause above has a population pin.
ok("the grounded answers carry non-empty fact lists with real row text",
  facts.length >= 6 && facts.every((f) => typeof f.text === "object" && "key" in f.text));

  // The scout report reaches the chat as evidence, so its verdict and provenance are
  // under the same contract as everything else the panel prints: rows, resolved per locale,
  // and a category named in the reader's language rather than as its code.
  const reports = ["Rodri", "Vinícius Júnior", "Jude Bellingham"].map((n) => scoutReport(getPlayerByName(n))).filter(Boolean);
  const withVector = reports.filter((r) => r.hasVector);
  ok("every scout verdict the AI can quote is a row (" + withVector.length + " reports)",
    withVector.length >= 2 && withVector.every((r) => isRow(r.headline)));
  ok("and its provenance chips are rows too",
    withVector.every((r) => r.sources.length >= 2 && r.sources.every(isRow)));
  ok("a verdict names its categories in the reader's own language, never as a code",
    locales.every((l) => withVector.every((r) => {
      const t = say(l)(r.headline);
      if (!t.trim() || /\{\w+\}/.test(t) || /^(sc|det|attr|ai)\.[a-z]/i.test(t)) return false;
      const codes = "key" in r.headline ? Object.entries(r.headline.vars ?? {}).filter(([k]) => k === "cat" || k === "cat2").map(([, v]) => String(v)) : [];
      return codes.every((c) => t.includes(DICTIONARIES[l]["attr." + c]) && !new RegExp("\\b" + c + "\\b").test(t));
    })));

  // Check 28c cannot reach this: `headline` is also a plain-string field somewhere in the
  // player page's import graph, so the name is shadowed and the derived gate stands down.
  // A row the page prints raw renders "[object Object]", so the read sites are asserted
  // against the screen's own source until a type-level gate exists.
  const PAGE = readFileSync("features/football/Details.tsx", "utf8");
  ok("the player page resolves every row the scout report publishes",
    /rowLine\(report\.headline,\s*t\)/.test(PAGE) &&
    PAGE.includes("{report.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}") &&
    /report\.sources\.map\(\(s\) => rowLine\(s, t\)\)/.test(PAGE));
  // M189 follow-up (#173): the career-arc panel is the same blind spot — `evidence` and
  // `sources` are shadowed names for check 28c, so a raw row print there is invisible to
  // the derived gate and has to be asserted against the screen's own source.
  const ARC_PAGE = readFileSync("features/football/Details.tsx", "utf8");
  ok("the player page resolves the career-arc rows rather than printing them",
    ARC_PAGE.includes("{arc.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}") &&
    ARC_PAGE.includes('sources: arc.sources.map((s) => rowLine(s, t)).join(" · ")'));
  const srcRows = answers.flatMap((a) => a.sources);
  ok("every source row resolves for all three locales without leaking a code",
    srcRows.length >= 4 && locales.every((l) => srcRows.every((r) => {
      const t = say(l)(r);
      return !!t.trim() && !/\{\w+\}/.test(t) && !/^(ai|dna|det|common)\.[a-z]/.test(t) && !/:\w+:/.test(t);
    })));
}

// ---- Always-grounded contract on every answer (evidence + sources + confidence) ----
if (vf) {
  const a = vf.ans;
  ok("answer is a non-empty list of rows", Array.isArray(a.answer) && a.answer.length > 0 && AT(a).length > 20);
  ok("answer ships an evidence fact list", Array.isArray(a.facts) && a.facts.length >= 1);
  ok("answer ships sources (or the honest 'no entity' label)", Array.isArray(a.sources) && a.sources.length >= 1);
  ok("confidence is an integer within the 20..92 band", Number.isInteger(a.confidence) && a.confidence >= 20 && a.confidence <= 92);
}

// ---- M106: the write-only raw-hits field is no longer carried on an answer ----
if (vf) ok("answer no longer exposes the removed `retrieved` field", !("retrieved" in vf.ans));

// ---- Determinism: identical question reproduces the grounded result ----
if (vf) {
  const b = askIntelligence(vf.q, EN);
  ok("deterministic answer rows", JSON.stringify(b.answer) === JSON.stringify(vf.ans.answer));
  ok("deterministic confidence", b.confidence === vf.ans.confidence);
  ok("deterministic facts", JSON.stringify(b.facts) === JSON.stringify(vf.ans.facts));
  ok("deterministic sources", JSON.stringify(b.sources) === JSON.stringify(vf.ans.sources));
}

// ---- M183: the chips and the source line are rows, in every locale ----
{
  const answers = ["How much is Mbappé worth?", "Where do Arsenal sit in the Premier League?", "Any transfer news about Haaland?", "Real Madrid"]
    .map((q) => askIntelligence(q, EN));
  const isRow = (x) => !!x && typeof x === "object" && ("key" in x || "value" in x);
  // M275: a source line's name var is the proper noun as a plain value, or — for the
  // news family — the headline's keyed row. Either half must be a real word, and the
  // `type:id` read applies to whichever half the var carries.
  const titleWord = (n) => (isRow(n) ? ("key" in n ? n.key : n.value) : String(n));
  const sources = answers.flatMap((a) => a.sources);
  const labels = answers.flatMap((a) => a.facts.map((f) => f.label));
  ok("every source line is a row naming a kind and a retrieved title",
    sources.length >= 4 && sources.every((s) => isRow(s) && "key" in s && s.key === "ai.src.entity" && SEARCH_KINDS.includes(s.vars.kind) && titleWord(s.vars.name).length > 1));
  ok("no source line carries the retrieval layer's own `type:id` code",
    !sources.some((s) => isRow(s) && "key" in s && titleWord(s.vars.name).includes(":")));
  const leaked = [];
  for (const s of sources) for (const l of locales) {
    if (!isRow(s)) { leaked.push(`${l}: ${JSON.stringify(s)} is not a row`); continue; }
    const line = say(l)(s);
    if (!line.trim() || /\{\w+\}/.test(line) || line.startsWith("ai.src")) leaked.push(`${l}: ${line}`);
    // The kind word must be the locale's own — the same row the graph legend renders.
    else if (!line.includes(DICTIONARIES[l][`ai.legend.${s.vars?.kind}`])) leaked.push(`${l}: kind left untranslated — ${line}`);
  }
  ok("a reader of any locale sees `Club · Real Madrid`, never `club:lr` (" + leaked.length + " bad)", leaked.length === 0);
  for (const b of leaked.slice(0, 4)) console.log("       " + b);
  ok("every evidence chip label is a row", labels.length >= 4 && labels.every(isRow));
  ok("a chip's English word is keyed, never typed as a value",
    labels.every((lab) => !isRow(lab) || "key" in lab || !["Standings", "Key man", "Profile", "Fixture", "Model", "Career arc", "Template edge", "Next fixture", "Next fixture model"].includes(lab.value)));
  const recordLabeled = labels.filter((lab) => isRow(lab) && "value" in lab);
  ok("a record-derived chip is never empty or a placeholder",
    recordLabeled.every((lab) => typeof lab.value === "string" && lab.value.trim().length > 1 && !/[{]/.test(lab.value)));
  const labelKeys = [...new Set(labels.filter((lab) => isRow(lab) && "key" in lab).map((lab) => lab.key))];
  ok("the queries above actually walk the chip vocabulary (" + labelKeys.length + " distinct labels)",
    labelKeys.length >= 4 && labelKeys.every((k) => k.startsWith("ai.lab.") || k.startsWith("det.scout.")));
  const chipLeaks = labels.filter((lab) => isRow(lab) && "key" in lab).flatMap((lab) => locales.filter((l) => !(DICTIONARIES[l][lab.key] ?? "").trim()))
    .concat(labels.filter((lab) => isRow(lab) && "key" in lab).flatMap((lab) => locales.filter((l) => /\{/.test(DICTIONARIES[l][lab.key] ?? ""))));
  ok("every chip word exists and interpolates nothing in all three locales (" + chipLeaks.length + " problems)", chipLeaks.length === 0);
  // The stored log is the other half of the contract: a chat row written before this
  // change holds plain strings, and they must still render as written rather than as
  // "[object Object]" or a bare key.
  const legacy = asRowText("club:mci");
  ok("the panel normalises a stored string answer into a row rather than reading it raw",
  /content: Array\.isArray\(m\.content\) \? m\.content : \[asRowText/.test(readFileSync("features/ai/AiStudio.tsx", "utf8")));
  ok("a stored plain-string row is kept verbatim, not re-interpreted",
    "value" in legacy && rowLine(legacy, (k) => k) === "club:mci");
  // The screen is the other half of the contract: a row the panel prints raw is
  // "[object Object]" on the page, and the raw-UI scan cannot see it because the words are
  // not in the component at all.
  const PANEL = readFileSync("features/ai/AiStudio.tsx", "utf8");
  ok("the chat panel interprets the chip label and the source row through rowLine",
    (PANEL.match(/rowLine\(f\.label,\s*t\)/g) ?? []).length === 2 && /rowLine\(s,\s*t\)/.test(PANEL));
  ok("and it reads the stored log through the normaliser, never the raw array",
    /entries\.map\(\(m, i\)/.test(PANEL) && !/\{\s*log\.map\(/.test(PANEL));
  ok("the normaliser is the boundary the legacy strings need",
    /asRowText\(f\.label/.test(PANEL) && /asRowText\(s\s+as\s+string\s*\|\s*RowText\)/.test(PANEL));
}

// ---- M195: the fixture fact renders its kickoff in the READER's language ----
// Everything above this block asks in one pinned locale, so nothing above could notice the
// evidence line going back to `new Date(m.kickoff).toLocaleString()`: that call is legal
// JavaScript, resolves to a real date, and still hands a 繁體中文 reader `Sep 12` because
// the browser — not the reader — was asked. Three things are pinned here: the kickoff
// changes when the reader changes, nothing else about the answer does, and the instant in
// the row is the match's own rather than the moment the question was typed.
{
  const CJK = /[一-鿿]/;
  // Self-selected, like the value fixtures: walk the scheduled matches, keep the first
  // question that actually lands a fixture fact, so a seeded-name change cannot silently
  // turn this block into a loop over zero cases.
  const scheduled = footballProvider.matches().filter((m) => m.status === "SCHEDULED");
  const nameOf = (id) => footballProvider.clubs().find((c) => c.id === id)?.name ?? "";
  const fixtureOf = (row) => row.facts.find((f) => "key" in f.text && f.text.key === "ai.fact.fixtureScheduled");
  // Walked latest-first on purpose: the probe has to be a fixture that is NOT today, or the
  // "answered with the wrong instant" falsifier below compares two dates that could match by
  // accident and its green proves nothing.
  //
  // And the match the row is ABOUT is taken from the row's own `to:` link rather than from
  // the fixture whose name was typed. That distinction was measured, not assumed: the first
  // version of this block compared the date against the match it asked about and went red,
  // because a club-named question is answered with that club's NEXT fixture (M61's citation),
  // which is a different record. Provenance has to be checked against the record the row
  // itself points at, or the gate is auditing the wrong row.
  const probeFor = (m) => {
    const [hn, an] = [nameOf(m.homeClubId), nameOf(m.awayClubId)];
    if (!hn || !an) return null;
    // The label retrieval itself prints for a fixture, so the question is one the layer can
    // rank to the top rather than a fragment that happens to survive the cut to five hits.
    const q = `Kickoff of ${hn} v ${an}`;
    const fact = fixtureOf(askIntelligence(q, EN));
    if (!fact) return null;
    const cited = scheduled.find((x) => "/matches/" + x.id === fact.to);
    return cited ? { q, cited } : null;
  };
  const far = (x) => Math.abs(new Date(x.kickoff).getTime() - Date.now()) > 5 * 864e5;
  let probe = null;
  for (const m of scheduled.slice().sort((a, b) => String(b.kickoff).localeCompare(String(a.kickoff)))) {
    const p = probeFor(m);
    if (!p) continue;
    probe ??= p;
    if (far(p.cited)) { probe = p; break; }
  }
  ok("a fixture question really reaches the scheduled-match evidence line (" + scheduled.length + " scheduled matches walked)",
    !!probe);
  ok("and the row is about a fixture at least five days away, so 'today' is a distinguishable wrong answer (" +
    (probe ? probe.cited.kickoff : "no probe") + ")",
    !!probe && far(probe.cited));
  if (probe) {
    const whenFor = (l) => fixtureOf(askIntelligence(probe.q, l)).text.vars.when;
    const perLocale = Object.fromEntries(locales.map((l) => [l, String(whenFor(l))]));
    const shown = locales.map((l) => `${l}=${perLocale[l]}`).join(" ");
    ok("the same kickoff is written differently for each reader (" + shown + ")",
      new Set(locales.map((l) => perLocale[l])).size === locales.length);
    ok("and each reader is shown their own script — CJK for Chinese, Latin month for English",
      !CJK.test(perLocale.en) && /[A-Za-z]{3}/.test(perLocale.en)
        && locales.filter((l) => l !== "en").every((l) => CJK.test(perLocale[l])));
    // The discriminating direction, stated as a falsifier rather than a shape: the answer
    // a 简体中文 reader gets must be the one a browser-locale call could NOT produce on
    // this host. Node's default here resolves en-US, so a regression to `toLocaleString()`
    // would make the zh rows equal the en row — which the clause above already turns red.
    const answers = Object.fromEntries(locales.map((l) => [l, askIntelligence(probe.q, l)]));
    const stripped = (a) => JSON.stringify(a.answer.map((r) => ("key" in r ? { ...r, vars: { ...r.vars, when: null } } : r)));
    ok("the reader's language changes the date's written form and nothing else",
      new Set(locales.map((l) => stripped(answers[l]))).size === 1
        && new Set(locales.map((l) => JSON.stringify(answers[l].facts.map((f) => ("key" in f.text && f.text.key === "ai.fact.fixtureScheduled" ? { ...f.text, vars: { ...f.text.vars, when: null } } : f.text))))).size === 1
        && new Set(locales.map((l) => answers[l].confidence)).size === 1);
    const unfilled = locales.filter((l) => /\{\w+\}|^ai\./.test(say(l)(fixtureOf(answers[l]).text)));
    ok("the panel's own line interpolates the date for every reader, with no bare key (" + unfilled.length + " bad)",
      unfilled.length === 0);
    // Value provenance: the row carries the cited match's kickoff, not the instant the
    // question was asked. Formatted by the gate with the record's own field as the source.
    const expected = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(probe.cited.kickoff));
    ok("the kickoff in the row is the record's own instant (" + expected + ")",
      perLocale.en === expected);
    const nowRendered = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    ok("and a fixture five days out is not answered with today's date (" + perLocale.en + " vs " + nowRendered + ")",
      perLocale.en !== nowRendered);
  }
}

// ---- M269: the match page's Match Intelligence path is rows end-to-end ----
// `askFootballAI` is the second answer surface (the fixture page's panel), and until now it
// took the caller's facts as English strings: the seeded pick interpolated one of them as a
// `{fact}` value var, so every sentence the caller composed reached both Chinese locales
// verbatim — in the answer lead and again in the evidence list. The panel now hands rows and
// reads rows; this block pins the contract the way the RAG path's blocks pin theirs.
{
  const { askFootballAI, englishRow } = await server.ssrLoadModule("/data/ai.ts");
  const compOf = (id) => footballProvider.competitions().find((c) => c.id === id)?.name ?? "";
  const m = footballProvider.matches().find((x) => x.status === "SCHEDULED");
  const home = footballProvider.clubs().find((c) => c.id === m.homeClubId);
  const away = footballProvider.clubs().find((c) => c.id === m.awayClubId);
  // The facts exactly as the screen builds them — one per live branch of the page's ask block
  // (matchup, no-simulation fallback, kickoff, possession), with fixture data as vars.
  const facts = [
    { key: "ai.qf.matchup", vars: { home: home.name, away: away.name, comp: compOf(m.competitionId) } },
    { key: "ai.qf.noSim" },
    { key: "ai.qf.kickoff", vars: { when: "Sep 12, 15:00" } },
    { key: "ai.qf.possession", vars: { n: "50" } },
  ];
  const label = { key: "ai.matchLabel", vars: { home: home.short, away: away.short } };
  const ans = await askFootballAI("Who controlled the midfield?", { label, facts });

  ok("the match-page answer is a list of rows, never a composed string",
    Array.isArray(ans.text) && ans.text.length >= 3 && ans.text.every(isRow));
  ok("the lead row is the question's own key, not a value var inside one sentence",
    "key" in ans.text[0] && ans.text[0].key === "ai.lead.player");
  ok("the evidence list is the fact rows themselves (" + ans.evidence.length + " rows)",
    ans.evidence.length === facts.length && ans.evidence.every(isRow));
  ok("every match-page row resolves in every locale with no placeholder and no bare key",
    locales.every((l) => [...ans.text, ...ans.evidence, ...ans.sources].every((r) => {
      const s = say(l)(r);
      return !!s.trim() && !/\{\w+\}/.test(s) && !/^(ai|qf)\./.test(s);
    })));
  ok("a Chinese reader reads a Chinese answer — none of the caller's old English survives",
    locales.filter((l) => l !== "en").every((l) => {
      const s = [...ans.text, ...ans.evidence].map((r) => say(l)(r)).join(" ");
      return !/Model projection|Possession bias|No simulation|Kickoff |Scoreline |vs /.test(s);
    }));
  ok("the seeded pick is reader-independent: the label's ENGLISH reading drives the draw, not its locale row",
    (await askFootballAI("Who controlled the midfield?", { label, facts })).confidence ===
    (await askFootballAI("Who controlled the midfield?", { label: { value: englishRow(label) }, facts })).confidence);
  const again = await askFootballAI("Who controlled the midfield?", { label, facts });
  ok("deterministic answer rows, evidence and confidence",
    JSON.stringify(again.text) === JSON.stringify(ans.text) &&
    JSON.stringify(again.evidence) === JSON.stringify(ans.evidence) &&
    again.confidence === ans.confidence);
}

// ---- M299: the coach's diagnosis sentences obey the var-name contract; the M216 ledger line closes ----
// M216's ledger charged data/ai.ts with "12 sentences a person reads still interpolate
// English words". M230 answered it by building the NAME contract — a row's variable is
// dispatched by its NAME (`focus`/`attrs`/`trained`/`last`/`new`/`arch`/`arch2`/`drill`
// resolve part by part through `codeWord`, `target`/`game` resolve as keys, `zone` through
// `zoneKey()`) — but the ledger line was never cleared. This block closes it against the
// provider itself: every vars slot the module writes dispatches by name, every coach key
// the module names is reached by a variant below and resolves in all three dictionaries,
// and eleven runs of generatePlan render their diagnosis, rationale and sources with no
// raw attribute key, no English label, no bare key and no broken figure in any locale.
{
  const { coachProvider } = await server.ssrLoadModule("/data/ai.ts");
  const { isCodeVar, isKeyVar } = await server.ssrLoadModule("/domain/rowText.ts");
  const { baselineAttributes, ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");

  // Static: every vars slot written in ai.ts, its NAME and whether its value is a joined list.
  const aiSrc = readFileSync(new URL("../data/ai.ts", import.meta.url), "utf8");
  const varNames = [...new Set(
    [...aiSrc.matchAll(/vars: \{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/(\w+):/g)].map((v) => v[1])),
  )];
  // A var that is neither code nor key may only carry a word or a number the record owns.
  const PLAIN_VARS = ["acwr", "rating", "minutes", "n", "count"];
  const joinedNames = [...new Set(
    [...aiSrc.matchAll(/(\w+): [^,}:{]*\.join\(/g)].map((m) => m[1]),
  )];
  ok(`ai.ts writes ${varNames.length} vars names (${varNames.sort().join(", ")}); every joined list is a CODE var (${joinedNames.sort().join(", ")})`,
    varNames.length >= 12 && joinedNames.length >= 5 && joinedNames.every((n) => isCodeVar(n)));
  ok(`every vars name is a code var, a key var, or one of the plain word/number slots (${PLAIN_VARS.join(", ")}) — nothing else carries prose`,
    varNames.every((n) => isCodeVar(n) || isKeyVar(n) || PLAIN_VARS.includes(n)));

  // The keys the source names outright (`key: "..."`); the `target`/`game` sub-keys ride
  // inside vars values and are charged by the dynamic block through the reader's column.
  const namedKeys = [...aiSrc.matchAll(/key: "((?:coach|ai|ld)\.[^"]+)"/g)].map((m) => m[1]);
  ok(`every one of the ${namedKeys.length} keys ai.ts names resolves in all three dictionaries`,
    namedKeys.length >= 20 && namedKeys.every((k) => locales.every((l) => !!DICTIONARIES[l][k])));

  // Dynamic: variants aimed at each branch of generatePlan — targeted exact/partial (the
  // partial arm needs a session too short to carry every asked attribute), the three load
  // zones with caution both with and without a ratio, a flagged request, a memory that
  // continues and one that rotates, and history that makes "trained recently" speak.
  const attrs = baselineAttributes("CM", 72);
  const profile = { displayName: "Probe", mode: "player", positionGroup: "CM", attributes: attrs };
  const ld = (zone, acwr, weekLoad) => ({ zone, acwr, weekLoad });
  const variants = [
    { name: "plain", input: { prompt: { value: "get better" }, availableMinutes: 45 } },
    { name: "targeted-exact", input: { prompt: { value: "role gap plan" }, availableMinutes: 45, focusKeys: ["passing", "dribbling"] } },
    { name: "targeted-partial", input: { prompt: { value: "role gap plan" }, availableMinutes: 5, focusKeys: ["passing", "dribbling", "scanning"] } },
    { name: "load-high", input: { prompt: { value: "get better" }, availableMinutes: 45, load: ld("high", 1.62, 2400) } },
    { name: "load-caution", input: { prompt: { value: "get better" }, availableMinutes: 45, load: ld("caution", 1.21, 1800) } },
    { name: "load-caution-no-ratio", input: { prompt: { value: "get better" }, availableMinutes: 45, load: ld("caution", null, 900) } },
    { name: "load-under", input: { prompt: { value: "get better" }, availableMinutes: 45, load: ld("under", 0.62, 300) } },
    { name: "requested", input: { prompt: { value: "I want passing and shooting work" }, availableMinutes: 45 } },
    { name: "continue", input: { prompt: { value: "same again" }, availableMinutes: 45, lastFocus: ["first_touch"] } },
    { name: "rotate", input: { prompt: { value: "something new" }, availableMinutes: 45, lastFocus: ["sprint"] } },
    { name: "recent", input: { prompt: { value: "passing session please" }, availableMinutes: 45, history: [{ focus: "passing", completed: 3 }] } },
  ];
  const keysSeen = new Set();
  const leaks = [];
  let renderedRows = 0;
  for (const v of variants) {
    const plan = await coachProvider.generatePlan({ profile, history: [], availableMinutes: 45, ...v.input });
    const rows = [...plan.diagnosis, ...plan.rationale, ...plan.sources];
    for (const r of rows) if ("key" in r) keysSeen.add(r.key);
    for (const l of locales) for (const r of rows) {
      renderedRows++;
      const s = say(l)(r) ?? "";
      const bad = [];
      if (/\{\w+\}/.test(s)) bad.push("placeholder");
      if (/(^|\s)(coach|ai|ld)\.[a-z]/.test(s)) bad.push("bare key");
      if (/\[object Object\]|undefined|NaN/.test(s)) bad.push("broken figure");
      if (l !== "en") {
        for (const k of ATTRIBUTE_KEYS) if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`, "i").test(s)) { bad.push(`raw key ${k}`); break; }
      }
      if (bad.length) leaks.push(`${v.name}/${l}: ${bad.join(",")} — ${s}`);
    }
  }
  ok(`eleven runs of the coach render ${renderedRows} rows across ${locales.length} locales with no raw attribute key, no placeholder, no bare key and no broken figure (leaks ${leaks.length})`,
    renderedRows > 300 && leaks.length === 0, leaks.slice(0, 3).join(" | "));
  // Coverage: the variants must REACH every coach key the source names — a branch nothing
  // renders would make the leak check vacuous for exactly that sentence.
  const coachKeys = namedKeys.filter((k) => k.startsWith("coach."));
  const missed = coachKeys.filter((k) => !keysSeen.has(k));
  ok(`the variants reach all ${coachKeys.length} coach keys the module names (${missed.length} unreached)`,
    coachKeys.length >= 20 && missed.length === 0, `unreached: ${missed.join(", ")}`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
