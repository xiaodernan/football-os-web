// M202 — a proof for domain/filmLibrary.ts, the one module several pillars read and no
// gate had ever looked at.
//
// The module's own doc comment makes the promise this file exists to test: "a corrupt or
// legacy entry is skipped, never crashes a page". Four screens call loadFilmClips() on
// mount (Film Room, Dashboard, Achievements, Learn hub) and two more walk the parsed list
// through toClipInputs, so a shape the parse lets through is a crash on a page — and the
// parse validated the clip, its two strings and the presence of an events ARRAY, but never
// what is inside that array.
//
// Sections: 1 what the parse accepts and refuses (both directions, per shape); 2 the safety
// property the doc claims (anything the parse keeps, toClipInputs can render); 3 the
// narrowing itself (fields, fallbacks, purity, order); 4 newestClipAt; 5 the storage
// round-trip through a localStorage stub, including the failure paths; 6 provenance — the
// key the module reads is the key the local-data registry says it is.
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const LIB = await server.ssrLoadModule("/domain/filmLibrary.ts");
const { parseFilmClips, loadFilmClips, saveFilmClips, toClipInputs, newestClipAt } = LIB;
const LOCAL = await server.ssrLoadModule("/domain/localData.ts");
const { FILM_KEY, LOCAL_KEYS } = LOCAL;
const { ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");
const { videoProvider } = await server.ssrLoadModule("/data/video.ts");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

// A report the Film Room could actually have written: one event, the fields VideoReport
// declares. Everything below perturbs this rather than inventing shapes.
const ev = (kind = "shot", extra = {}) => ({ t: 4.5, kind, note: "into space", confidence: 0.7, ...extra });
const report = (events = [ev()]) => ({
  fileId: "f1", fileName: "clip.mp4", durationSec: 61, provider: "demo", demo: true,
  strengths: ["first touch"], weaknesses: [], improvements: [], events,
  frames: [{ t: 4.5, label: "shot" }], confidence: 0.8, recommendedFocus: ["pressing"],
});
const clip = (over = {}) => ({ clipId: "c1", addedAt: "2026-05-01T12:00:00.000Z", report: report(), ...over });

// A clip the FILM ROOM itself would write: the same provider call the page makes, with
// attributes on the declared keys. This anchors the acceptance table to the shape that
// really lands in the slot rather than to a hand-drawn ideal.
const realReport = await videoProvider.analyze({
  fileId: "proof-film", fileName: "clip.mp4", sizeBytes: 1_048_576,
  attrs: Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 60])),
});
const clipFromData = { clipId: "real-1", addedAt: new Date(0).toISOString(), report: realReport };
ok(`the provider's own report shape survives the parse (${realReport.events.length} events, kinds ${[...new Set(realReport.events.map((e) => e.kind))].join("/")})`,
  parseFilmClips([clipFromData]).length === 1 && realReport.events.length > 0);
ok(`…and narrowing it yields one row per event with no fields left over (${toClipInputs([clipFromData])[0].events.length} event rows)`,
  toClipInputs([clipFromData])[0].events.length === realReport.events.length &&
    Object.keys(toClipInputs([clipFromData])[0].events[0]).join() === "kind");

// ---------------------------------------------------------------------------
// 1 · acceptance, per shape — kept or skipped, stated both ways.
// ---------------------------------------------------------------------------
const SHAPES = [
  // [label, value, expectKept]
  ["a well-formed clip", clip(), true],
  ["a clip with an empty events array", clip({ report: report([]) }), true],
  ["a clip whose report has no optional fields", { clipId: "x", addedAt: "t", report: { events: [ev()] } }, true],
  ["null", null, false],
  ["undefined", undefined, false],
  ["a number", 7, false],
  ["a string", "clip", false],
  ["an array", [], false],
  ["a clip missing clipId", { addedAt: "t", report: report() }, false],
  ["a clip whose clipId is a number", clip({ clipId: 5 }), false],
  ["a clip missing addedAt", { clipId: "c", report: report() }, false],
  ["a clip whose addedAt is a number", clip({ addedAt: 5 }), false],
  ["a clip with no report", { clipId: "c", addedAt: "t" }, false],
  ["a clip whose report is a string", clip({ report: "gone" }), false],
  ["a clip whose report has no events", { clipId: "c", addedAt: "t", report: { confidence: 1 } }, false],
  ["a clip whose events is an object", clip({ report: { events: { 0: ev() } } }), false],
  // The hole: the parse checked that `events` is an array and never looked inside it, so
  // each of these survived a "defensive" parse and then threw in the reader.
  ["an events array containing null", clip({ report: report([null]) }), false],
  ["an events array containing undefined", clip({ report: report([undefined]) }), false],
  ["an events array containing a number", clip({ report: report([3]) }), false],
  ["an events array containing a string", clip({ report: report(["shot"]) }), false],
  ["an events array containing an object with no kind", clip({ report: report([{}]) }), false],
  ["an events array whose kind is null", clip({ report: report([{ t: 1, kind: null }]) }), false],
  ["an events array whose kind is a number", clip({ report: report([{ t: 1, kind: 2 }]) }), false],
  ["an events array with one good event and one malformed", clip({ report: report([ev(), null]) }), false],
  ["an event with a kind but no timestamps", clip({ report: report([{ kind: "pass" }]) }), true],
];
const kept = (v) => parseFilmClips([v]).length === 1;
const wrong = SHAPES.filter(([label, v, want]) => kept(v) !== want);
ok(`the parse keeps exactly the ${SHAPES.filter(([, , w]) => w).length} shapes it can render and refuses the ${SHAPES.filter(([, , w]) => !w).length} it cannot (${wrong.map(([l]) => l).join("; ") || "every shape agrees"})`,
  wrong.length === 0);
ok(`and the split is measured, not assumed: ${SHAPES.length} shapes walked, ${SHAPES.filter(([, , w]) => w).length} accepted`,
  SHAPES.length >= 20 && SHAPES.filter(([, , w]) => w).length >= 3);

// ---------------------------------------------------------------------------
// 2 · the promise in the doc comment, as a property over the same table.
// ---------------------------------------------------------------------------
const thrown = [];
for (const [label, v] of SHAPES) {
  try { toClipInputs(parseFilmClips([v])); } catch (err) { thrown.push(`${label}: ${err.message}`); }
}
ok(`nothing the parse returns can make a reader throw — toClipInputs ran over all ${SHAPES.length} raw inputs without an exception (${thrown.join(" | ") || "clean"})`,
  thrown.length === 0);
const afterFix = ["an events array containing null", "an events array containing a number"];
ok(`…and the corrupt-event shapes are refused BY THE PARSE rather than rescued downstream (${afterFix.map((l) => { const [, v] = SHAPES.find(([n]) => n === l); return `${l}=${kept(v) ? "kept" : "skipped"}`; }).join(", ")})`,
  afterFix.every((l) => !kept(SHAPES.find(([n]) => n === l)[1])));

// ---------------------------------------------------------------------------
// 3 · toClipInputs: field mapping, fallbacks, purity, order.
// ---------------------------------------------------------------------------
const ins = toClipInputs([clip(), clip({ clipId: "c2", addedAt: "2026-05-02T12:00:00.000Z", report: report([ev("pass"), ev("dribble")]) })]);
ok(`one row per clip, in the order given (${ins.length} rows)`,
  ins.length === 2 && ins[1].events.length === 2);
ok("a clip input carries at/durationSec/confidence/events/recommendedFocus from the report",
  ins[0].at === "2026-05-01T12:00:00.000Z" && ins[0].durationSec === 61 && ins[0].confidence === 0.8 &&
    ins[0].events[0].kind === "shot" && JSON.stringify(ins[0].recommendedFocus) === JSON.stringify(["pressing"]));
ok("…and keeps only the event kind — the library-level analysis must not see note/t/confidence",
  JSON.stringify(Object.keys(ins[0].events[0]).sort()) === JSON.stringify(["kind"]));
const sparse = toClipInputs([{ clipId: "s", addedAt: "t", report: { events: [] } }]);
ok(`a report missing its optional numbers narrows to 0 and [] rather than undefined (${JSON.stringify(sparse[0])})`,
  sparse[0].durationSec === 0 && sparse[0].confidence === 0 && JSON.stringify(sparse[0].recommendedFocus) === JSON.stringify([]));
ok("an empty clip list narrows to an empty list", toClipInputs([]).length === 0);
const before = JSON.stringify([clip()]);
toClipInputs([clip()]);
ok("the narrowing does not touch the clips it was handed", JSON.stringify([clip()]) === before);
const source = [clip()];
const derived = toClipInputs(source);
derived[0].recommendedFocus.push("injected");
derived[0].events.push({ kind: "shot" });
ok(`…and returns fresh arrays, so a caller editing a row cannot reach the stored clip (focus ${source[0].report.recommendedFocus.length}/1, events ${source[0].report.events.length}/1)`,
  source[0].report.recommendedFocus.length === 1 && source[0].report.events.length === 1);

// ---------------------------------------------------------------------------
// 4 · newestClipAt
// ---------------------------------------------------------------------------
ok("newestClipAt is undefined over an empty library", newestClipAt([]) === undefined);
const stamps = [clip({ addedAt: "2026-05-01T00:00:00.000Z" }), clip({ clipId: "b", addedAt: "2026-07-04T00:00:00.000Z" }), clip({ clipId: "c", addedAt: "2026-05-09T00:00:00.000Z" })];
ok(`it returns the newest ISO stamp regardless of list order (${newestClipAt(stamps)})`,
  newestClipAt(stamps) === "2026-07-04T00:00:00.000Z" && newestClipAt([...stamps].reverse()) === "2026-07-04T00:00:00.000Z");
ok(`…and ignores an empty stamp rather than returning it (${newestClipAt([clip({ addedAt: "" }), ...stamps]) ?? "undefined"})`,
  newestClipAt([clip({ addedAt: "" }), ...stamps]) === "2026-07-04T00:00:00.000Z");
ok("a library of nothing but empty stamps has no newest clip", newestClipAt([clip({ addedAt: "" })]) === undefined);
const stampBefore = JSON.stringify(stamps);
newestClipAt(stamps);
ok("it does not reorder the list it was given", JSON.stringify(stamps) === stampBefore);
// Two formats the store could hold after a version change: date-only vs full ISO. The sort
// is a string compare, so this documents which one wins rather than leaving it to chance.
const MIXED = [clip({ addedAt: "2026-07-04" }), clip({ clipId: "d", addedAt: "2026-07-04T00:00:00.000Z" })];
ok(`mixed stamp formats resolve deterministically (${newestClipAt(MIXED)} beats ${newestClipAt([...MIXED].reverse())})`,
  newestClipAt(MIXED) === newestClipAt([...MIXED].reverse()));

// ---------------------------------------------------------------------------
// 5 · the storage boundary, through a stub that behaves like the browser's.
// ---------------------------------------------------------------------------
function withStore(items, fn) {
  const store = new Map(Object.entries(items));
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  };
  try { return { out: fn(store), store }; } finally { delete globalThis.localStorage; }
}
function withBrokenStore(fn) {
  globalThis.localStorage = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
  try { return fn(); } finally { delete globalThis.localStorage; }
}
const written = [clip(), clip({ clipId: "c2" })];
const rt = withStore({}, () => { saveFilmClips(written); return loadFilmClips(); }).out ?? [];
ok(`save then load returns the same clips (${rt.length} rows)`, rt.length === 2 && rt[0]?.clipId === "c1" && rt[1]?.clipId === "c2");
const corrupt = { "x": "not json" };
ok(`corrupt JSON in the slot loads as an empty library, not a throw (${JSON.stringify(withStore({ [FILM_KEY]: "{oops" }, loadFilmClips).out)})`,
  withStore({ [FILM_KEY]: "{oops" }, loadFilmClips).out.length === 0);
ok(`an object where an array belongs loads empty (${withStore({ [FILM_KEY]: '{"a":1}' }, loadFilmClips).out.length})`,
  withStore({ [FILM_KEY]: '{"a":1}' }, loadFilmClips).out.length === 0);
ok(`an absent key loads empty (${withStore({}, loadFilmClips).out.length})`,
  withStore({}, loadFilmClips).out.length === 0);
ok(`null in the slot loads empty (${withStore({ [FILM_KEY]: "null" }, loadFilmClips).out.length})`,
  withStore({ [FILM_KEY]: "null" }, loadFilmClips).out.length === 0);
ok("a corrupt LIST drops only the bad entries (the good clip still reaches the page)",
  withStore({ [FILM_KEY]: JSON.stringify([clip(), { nope: 1 }, clip({ clipId: "c3" })]) }, loadFilmClips).out.map((c) => c.clipId).join(",") === "c1,c3");
ok(`a throwing localStorage never escapes the module (load=${withBrokenStore(loadFilmClips).length}, save=${(() => { try { withBrokenStore(() => saveFilmClips(written)); return "no throw"; } catch { return "THREW"; } })()})`,
  withBrokenStore(loadFilmClips).length === 0 && (() => { try { withBrokenStore(() => saveFilmClips(written)); return true; } catch { return false; } })());
ok(`a round-trip through JSON keeps the events intact (${rt[0]?.report?.events?.[0]?.kind ?? "no event"})`,
  rt[0]?.report?.events?.[0]?.kind === "shot");

// ---------------------------------------------------------------------------
// 6 · provenance: the key, the registry, and the readers.
// ---------------------------------------------------------------------------
ok(`FILM_KEY is ${FILM_KEY} and is one of the ${LOCAL_KEYS.length} keys the local-data registry declares`,
  typeof FILM_KEY === "string" && FILM_KEY === "football-os.film.v1" && LOCAL_KEYS.some((e) => e.key === FILM_KEY));
const entry = LOCAL_KEYS.find((e) => e.key === FILM_KEY);
ok(`…and the registry says what kind of thing it is (${entry ? `${entry.kind} / ${entry.labelKey}` : "not found"})`,
  !!entry && entry.kind === "activity" && typeof entry.labelKey === "string");
const readers = ["features/film/FilmRoom.tsx", "features/dashboard/Dashboard.tsx", "features/achievements/AchievementsPage.tsx", "features/learn/LearnHub.tsx"];
const here = dirname(fileURLToPath(import.meta.url));
const stillReading = readers.filter((p) => readFileSync(join(here, "..", p), "utf8").includes("loadFilmClips"));
ok(`all ${stillReading.length} screens that count or render clips go through this module (${stillReading.map((p) => p.split("/").pop()).join(", ")})`,
  stillReading.length === readers.length);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
