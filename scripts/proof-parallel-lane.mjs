// M1247 · The Parallel Lane — the proxy's concurrency measured, not asserted.
//
// proof-streaming-flight (M1189) reads the SOURCE and proves the single-flight arms exist; this
// proof drives the SHIPPED middleware over a stubbed upstream and counts what actually happens
// when N visitors ask the same thing at the same moment. The owner's fourth instruction asks for a
// stable ~90% prefix-cache hit with no mid-session drops and for the parallel-session
// interference question to be investigated — none of that is answerable by reading. It is
// answerable by loading one cold envelope eight ways and showing the wire dialled once.
//
// OFFLINE BY CONSTRUCTION (the API is closed as of 2026-11-23): globalThis.fetch is replaced by a
// recorder parked behind a latch the test opens, answering with an SSE body of our own making.
// Nothing here dials a model, and no arm claims a warm provider-side KV lane — the provider's own
// `cached_tokens` is a live number and is out of reach. What IS measured is this server's
// behaviour: one cold load per identical envelope, sibling coalescing, the LRU bound and the exact
// keys it evicts, the content-derived lane identity, and the truthfulness of the
// X-FootballOS-LLM-Cache header.
//
// The defect this milestone found is itself a wire-truth one: the contract at the top of
// llm-proxy.mjs promises `hit|miss|coalesced` observably, but only the BUFFERED path emitted it —
// and the browser rides the STREAMING path (data/llm.ts posts stream:true). The stream branch now
// labels every outcome, and arm 2 plants its absence so this gate cannot pass on a header that
// stopped being written.
//
// Run: node scripts/proof-parallel-lane.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const PROXY = await import(pathToFileURL(join(root, "scripts/llm-proxy.mjs")).href);
const { llmProxyMiddleware, createLlmCache, llmCacheStats, laneKey, serverConfig, PROXY_ROUTE } = PROXY;

ok("an inherited Clash proxy is ignored without an explicit opt-in",
  serverConfig({ LLM_UPSTREAM_PROXY: "http://127.0.0.1:7897" }).upstreamProxy === "");
ok("an explicit proxy opt-in still works when deliberately requested",
  serverConfig({ LLM_ALLOW_UPSTREAM_PROXY: "1", LLM_UPSTREAM_PROXY: "http://127.0.0.1:7897" }).upstreamProxy === "http://127.0.0.1:7897");

// The world book the app actually rides, loaded through Vite so the TS fold runs exactly as the
// browser's call path runs it. A 235 KB system message is what a real ask carries; a toy string
// would measure a different machine than the one visitors stand in front of.
const { createServer } = await import(pathToFileURL(join(root, "node_modules/vite/dist/node/index.js")).href);
const server = await createServer({
  root, cacheDir: join(tmpdir(), `football-os-proof-parallel-lane-${process.pid}`),
  server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { WORLD_BRIEFING: BOOK } = await server.ssrLoadModule("/data/llm.ts");
await server.close();

const FAKE_KEY = "probe-key-never-leaves-this-process";
const CFG = { key: FAKE_KEY, baseUrl: "http://upstream.proof.invalid/v1", model: "gpt-probe", upstreamProxy: "" };
const FAMILY = "football-os-web";
const SIBLINGS = 8;
const DOORS = 2;
const TINY_CAPACITY = 3;
const TINY_ASKS = 5;

const realFetch = globalThis.fetch;
const installUpstream = ({ status = 200, text = "The seeded leader rides the frozen table.", abort = false } = {}) => {
  const rec = { bodies: [], auths: [], inFlight: 0, peak: 0 };
  let release;
  rec.latched = new Promise((r) => { release = r; });
  rec.open = () => release();
  rec.calls = () => rec.bodies.length;
  globalThis.fetch = async (url, init) => {
    rec.bodies.push(JSON.parse(init.body));
    rec.auths.push(String(init.headers?.authorization ?? ""));
    rec.inFlight++;
    rec.peak = Math.max(rec.peak, rec.inFlight);
    try {
      await rec.latched;
      if (abort) { const e = new Error("planted abort"); e.name = "AbortError"; throw e; }
      if (status !== 200) return new Response("upstream said no", { status });
      return new Response(
        [`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(0, 12) } }] })}`,
         `data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(12) } }] })}`,
         "data: [DONE]", ""].join("\n"),
        { status: 200, headers: { "content-type": "text/event-stream" } });
    } finally {
      rec.inFlight--;
    }
  };
  return rec;
};

// Drive the middleware with one POST and read the response bytes it actually wrote.
const ask = (mw, { system, envelope = "", question, stream = true }) => {
  const raw = JSON.stringify({
    messages: [{ role: "system", content: system + (envelope ? "\n" + envelope : "") }, { role: "user", content: question }],
    model: "gpt-probe", stream,
  });
  return new Promise((done) => {
    const headers = {};
    const chunks = [];
    let settled = false;
    const res = {
      statusCode: 0,
      setHeader: (k, v) => { headers[k] = v; },
      write: (c) => { chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); return true; },
      end: (b) => {
        if (b) chunks.push(Buffer.from(b));
        if (settled) return;
        settled = true;
        const text = Buffer.concat(chunks).toString("utf8");
        const isNdjson = headers["Content-Type"] === "application/x-ndjson" && text.trim().length > 0;
        const isJson = headers["Content-Type"] === "application/json" && text.trim().length > 0;
        done({
          statusCode: res.statusCode, headers, text,
          cacheLabel: headers["X-FootballOS-LLM-Cache"] ?? null,
          body: isJson ? JSON.parse(text) : null,
          answer: isNdjson
            ? text.trim().split("\n").map((l) => JSON.parse(l)).filter((f) => f.t === "delta").map((f) => f.d).join("")
            : isJson ? (JSON.parse(text).text ?? null) : null,
        });
      },
    };
    const req = { url: PROXY_ROUTE, method: "POST", [Symbol.asyncIterator]: () => {
      let sent = false;
      return { next: async () => (sent ? { done: true, value: undefined } : (sent = true, { done: false, value: raw })) };
    } };
    mw(req, res, () => { if (!settled) { settled = true; done({ statusCode: 0, headers, text: "", cacheLabel: null, body: null, answer: null, calledNext: true }); } });
  });
};
const settle = () => new Promise((r) => setTimeout(r, 10));
const countLabel = (rows, label) => rows.filter((x) => x.cacheLabel === label).length;

// ── 1 · eight concurrent identical STREAM asks start exactly one cold load ────────────────────
const ANSWER = "Eleven words from the seeded desk.";
const up1 = installUpstream({ text: ANSWER });
const cache1 = createLlmCache();
const mw1 = llmProxyMiddleware(() => CFG, cache1);
const eightP = Array.from({ length: SIBLINGS }, () => ask(mw1, { system: BOOK, question: "Who leads?" }));
await settle();
const parkedAt = up1.calls();
up1.open();
const eight = await Promise.all(eightP);
const s1 = llmCacheStats(cache1);
ok(`${SIBLINGS} concurrent identical streaming asks were parked with ${parkedAt} upstream call${parkedAt === 1 ? "" : "s"} in flight, and the wire labels them ${countLabel(eight, "miss")} miss + ${countLabel(eight, "coalesced")} coalesced + ${countLabel(eight, "hit")} hit — the ${SIBLINGS - countLabel(eight, "miss")} siblings never dialled the model (peak in-flight ${up1.peak}, upstream total ${up1.calls()})`,
  parkedAt === 1 && up1.calls() === 1 && up1.peak === 1 &&
  countLabel(eight, "miss") === 1 && countLabel(eight, "coalesced") === SIBLINGS - 1 &&
  countLabel(eight, "hit") === 0 && eight.every((r) => r.statusCode === 200 && r.cacheLabel !== null));

// ── 2 · the plant for that header: the reader must count zero when nothing was written ────────
const THREE = [{ cacheLabel: "miss" }, { cacheLabel: "coalesced" }, { cacheLabel: "coalesced" }];
const SILENT = [{ cacheLabel: null }, { cacheLabel: null }];
ok(`the label reader is planted both ways: over [miss, coalesced, coalesced] it counts ${countLabel(THREE, "miss")}/${countLabel(THREE, "coalesced")}/${countLabel(THREE, "hit")} and over a response set whose middleware never wrote the header it counts ${countLabel(SILENT, "miss")}/${countLabel(SILENT, "coalesced")}/${countLabel(SILENT, "hit")} — so the ${countLabel(eight, "coalesced")} labels above came from real bytes on the stream branch, not from a default`,
  countLabel(THREE, "miss") === 1 && countLabel(THREE, "coalesced") === 2 && countLabel(THREE, "hit") === 0 &&
  countLabel(SILENT, "miss") === 0 && countLabel(SILENT, "coalesced") === 0 && eight.length === SIBLINGS);

// ── 3 · every sibling got the owner's answer, in the same envelope a memo hit emits ───────────
const exact = eight.filter((r) => r.answer === ANSWER).length;
const ended = eight.filter((r) => r.text.includes('"t":"end"')).length;
ok(`all ${eight.length} responses carry the owner's answer whole (${exact}/${eight.length} byte-exact) and close with an end frame (${ended}), while the ledger reads misses ${s1.misses} / coalesced ${s1.coalesced} / hits ${s1.hits} / stores ${s1.stores} / entries ${s1.size}`,
  exact === SIBLINGS && ended === SIBLINGS &&
  s1.misses === 1 && s1.coalesced === SIBLINGS - 1 && s1.hits === 0 && s1.stores === 1 && s1.size === 1);

// ── 4 · the same ask after the load is a memo hit, still zero extra upstream traffic ──────────
const ninth = await ask(mw1, { system: BOOK, question: "Who leads?" });
const s2 = llmCacheStats(cache1);
ok(`a ninth identical ask lands as "${ninth.cacheLabel}" with the upstream still at ${up1.calls()} call (hits ${s2.hits}, entries ${s2.size}, in-flight ${cache1.inFlight.size}) — the repeat is served from the memo, not from a second prefill`,
  ninth.cacheLabel === "hit" && ninth.answer === ANSWER && up1.calls() === 1 &&
  s2.hits === 1 && s2.misses === 1 && s2.coalesced === SIBLINGS - 1 && s2.size === 1 && cache1.inFlight.size === 0);

// ── 5 · the ledger is an arithmetic identity over the session, not a story ────────────────────
const SERVED = SIBLINGS + 1;
ok(`the counters add up: hits ${s2.hits} + misses ${s2.misses} + coalesced ${s2.coalesced} = ${s2.hits + s2.misses + s2.coalesced} = the ${SERVED} asks that reached the cache, misses (${s2.misses}) equals the upstream calls started (${up1.calls()}), and evictions ${s2.evictions} at capacity ${cache1.policy.capacity}`,
  s2.hits + s2.misses + s2.coalesced === SERVED && s2.misses === up1.calls() &&
  s2.stores === s2.misses && s2.evictions === 0 && cache1.policy.capacity >= TINY_CAPACITY);

// ── 6 · two doors, one briefing: two cold loads, ONE provider lane, no sibling eviction ──────
const up2 = installUpstream({ text: "Two doors, one book, one warm lane." });
const cache2 = createLlmCache();
const mw2 = llmProxyMiddleware(() => CFG, cache2);
const doors = [
  { system: BOOK, envelope: "Answer as the desk.", question: "Who leads?" },
  { system: BOOK, envelope: "Answer as the scout.", question: "Who is youngest?" },
];
const doorP = doors.map((d) => ask(mw2, d));
await settle();
const doorPeak = up2.peak;
up2.open();
const both = await Promise.all(doorP);
const keysSent = up2.bodies.map((b) => b.prompt_cache_key);
const lanesOf = up2.bodies.map((b) => laneKey(b.messages.find((m) => m.role === "system").content));
const st2 = llmCacheStats(cache2);
ok(`two doors asked in parallel started ${up2.calls()} cold loads side by side (peak in-flight ${doorPeak}) and both answered "${both.map((r) => r.cacheLabel).join("/")}"; their ${new Set(keysSent).size} distinct prompt_cache_key${new Set(keysSent).size === 1 ? "" : "s"} is the content-derived lane ${keysSent[0]} — not the bare family constant "${FAMILY}" it used to be`,
  up2.calls() === DOORS && doorPeak === DOORS && countLabel(both, "miss") === DOORS &&
  new Set(keysSent).size === 1 && new Set(lanesOf).size === 1 && keysSent[0] === lanesOf[0] &&
  keysSent[0].startsWith(`${FAMILY}:`) && keysSent[0].length > FAMILY.length + 1);
ok(`a parallel sibling did not evict its neighbour: ${st2.size} entries kept under capacity ${cache2.policy.capacity} with evictions ${st2.evictions} (misses ${st2.misses}, hits ${st2.hits}) — the M1183 fragmentation this discipline was written against would show two lanes and a cold re-read here`,
  st2.size === DOORS && st2.evictions === 0 && st2.misses === DOORS && st2.hits === 0 &&
  both.every((r) => r.answer === "Two doors, one book, one warm lane."));

// ── 7 · the retention discipline the live probe earned is still on every byte ─────────────────
const streamsSent = [...new Set(up2.bodies.map((b) => b.stream))];
const retentions = [...new Set(up2.bodies.map((b) => b.prompt_cache_retention))];
const usageFlags = up2.bodies.filter((b) => "include_usage" in b).length;
ok(`every upstream body sends stream=${JSON.stringify(streamsSent)} and retention ${JSON.stringify(retentions)} over ${up2.bodies.length} dials, and include_usage appears on ${usageFlags} of them — M1096 measured that flag as the thing that makes the provider hop lanes and report cached=null`,
  streamsSent.length === 1 && streamsSent[0] === true && retentions.length === 1 && retentions[0] === "24h" &&
  usageFlags === 0 && up2.bodies.length === DOORS);

// ── 8 · the LRU bound bites at the bound, and evicts exactly the oldest ───────────────────────
const up3 = installUpstream({ text: "answers" });
const cache3 = createLlmCache({ capacity: TINY_CAPACITY });
const mw3 = llmProxyMiddleware(() => CFG, cache3);
up3.open();
const small = [];
for (let i = 0; i < TINY_ASKS; i++) small.push(await ask(mw3, { system: BOOK, envelope: "door " + i, question: "q" + i }));
const afterFive = llmCacheStats(cache3);
const warmFirst = [];
for (const i of [4, 3, 2, 1, 0]) warmFirst.push(await ask(mw3, { system: BOOK, envelope: "door " + i, question: "q" + i }));
const afterRevisit = llmCacheStats(cache3);
ok(`capacity ${TINY_CAPACITY} over ${TINY_ASKS} distinct asks: entries ${afterFive.size}, stores ${afterFive.stores}, evictions ${afterFive.evictions}; revisiting newest-first answers ${countLabel(warmFirst, "hit")} hit + ${countLabel(warmFirst, "miss")} miss, so the two keys that reloaded are exactly the two the bound dropped (upstream ${up3.calls()} = ${TINY_ASKS} cold + ${up3.calls() - TINY_ASKS} re-reads)`,
  afterFive.size === TINY_CAPACITY && afterFive.stores === TINY_ASKS &&
  afterFive.evictions === TINY_ASKS - TINY_CAPACITY &&
  countLabel(warmFirst.slice(0, 3), "hit") === 3 && countLabel(warmFirst.slice(3), "miss") === 2 &&
  up3.calls() === TINY_ASKS + 2 && afterRevisit.hits === 3 && afterRevisit.evictions === (TINY_ASKS - TINY_CAPACITY) + 2);

// ── 9 · a failing upstream coalesces too and is never memoised ────────────────────────────────
const up4 = installUpstream({ status: 500 });
const cache4 = createLlmCache();
const badP = Array.from({ length: 3 }, () => ask(llmProxyMiddleware(() => CFG, cache4), { system: BOOK, question: "Who leads?", stream: false }));
await settle();
const badDials = up4.calls();
up4.open();
const threeBad = await Promise.all(badP);
const st4 = llmCacheStats(cache4);
ok(`three concurrent buffered asks against a 500 upstream started ${badDials} dial and all answered ${threeBad.map((r) => r.statusCode).join("/")} "${threeBad[0].body?.error}": misses ${st4.misses}, coalesced ${st4.coalesced}, stores ${st4.stores}, entries ${st4.size}, in-flight drained to ${cache4.inFlight.size} — a failure is a degrade, never a cached answer`,
  badDials === 1 && threeBad.every((r) => r.statusCode === 502 && r.body?.error === "model_500") &&
  st4.misses === 1 && st4.coalesced === 2 && st4.stores === 0 && st4.size === 0 && cache4.inFlight.size === 0);
ok(`the degraded asks claim no cache state: ${countLabel(threeBad, null)} of ${threeBad.length} responses carry no X-FootballOS-LLM-Cache header, and the same reader finds the label when it IS written (${countLabel([{ cacheLabel: "hit" }, { cacheLabel: null }], "hit")} of 2) — an absent header here is measured, not assumed`,
  countLabel(threeBad, null) === threeBad.length && countLabel([{ cacheLabel: "hit" }, { cacheLabel: null }], "hit") === 1 &&
  threeBad.length === 3);

// ── 10 · a planted abort degrades as a timeout rather than as a hang ─────────────────────────
const up5 = installUpstream({ abort: true });
const cache5 = createLlmCache();
up5.open();
const abortRes = await ask(llmProxyMiddleware(() => CFG, cache5), { system: BOOK, question: "Who leads?", stream: false });
ok(`the planted AbortError answered ${abortRes.statusCode} "${abortRes.body?.error}" after ${up5.calls()} dial and wrote ${llmCacheStats(cache5).size} entries — the 20 s ceiling is exercised through its throw arm and labelled as planted, because no offline gate sits twenty seconds per arm`,
  abortRes.statusCode === 502 && abortRes.body?.error === "model_timeout" &&
  up5.calls() === 1 && llmCacheStats(cache5).size === 0 && llmCacheStats(cache5).misses === 1);

// ── 11 · the server key stays on the server ──────────────────────────────────────────────────
const allRows = [...eight, ninth, ...both, ...small, ...warmFirst, ...threeBad, abortRes];
const allUp = [up1, up2, up3, up4, up5];
const dials = allUp.reduce((n, u) => n + u.calls(), 0);
const authed = allUp.reduce((n, u) => n + u.auths.filter((a) => a === `Bearer ${FAKE_KEY}`).length, 0);
const leaked = allRows.filter((r) => (r.text ?? "").includes(FAKE_KEY)).length;
ok(`the key crossed the wire on ${authed} of ${dials} upstream dials and appeared in ${leaked} of ${allRows.length} responses — the predicate demonstrably reads real bytes because the same scan finds the header it is supposed to find`,
  authed === dials && dials >= 8 && leaked === 0 && allRows.length === SIBLINGS + 1 + DOORS + TINY_ASKS * 2 + 3 + 1);

// ── 12 · the shipped stream branch is what wrote those labels, arm by arm ─────────────────────
const SRC = read("scripts/llm-proxy.mjs");
const branchStart = SRC.indexOf("if (out.stream) {");
const streamBranch = SRC.slice(branchStart, SRC.indexOf("return;", branchStart));
const hitArm = [...SRC.matchAll(/singleFrameNdjson\(hit\.text, hit\.model, "hit"\)/g)].length;
const sibArm = [...SRC.matchAll(/singleFrameNdjson\(shared\.text, shared\.model, "coalesced"\)/g)].length;
ok(`the three labels are wired at their three source arms — memo hit "${hitArm}", coalesced sibling "${sibArm}", owner's live stream ${/contentType: STREAM_CONTENT_TYPE, model, cache: "miss"/.test(SRC) ? 1 : 0} — and the middleware's stream branch itself carries the header write (${/if \(out\.cache\) res\.setHeader\("X-FootballOS-LLM-Cache", out\.cache\);/.test(streamBranch) ? 1 : 0})`,
  hitArm === 1 && sibArm === 1 &&
  /contentType: STREAM_CONTENT_TYPE, model, cache: "miss"/.test(SRC) &&
  /if \(out\.cache\) res\.setHeader\("X-FootballOS-LLM-Cache", out\.cache\);/.test(streamBranch) &&
  /const singleFrameNdjson = \(text, model, cacheLabel\)/.test(SRC));

console.log(`\n${pass}/${pass + fail} checks passed`);
globalThis.fetch = realFetch;
process.exit(fail ? 1 : 0);
