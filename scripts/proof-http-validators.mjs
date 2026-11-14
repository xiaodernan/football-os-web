// M1079 — the conditional-GET discipline, pinned as a deterministic static gate.
//
// WHAT THIS LOCKS DOWN. The reactor serves three frozen world snapshots (league-summary.json,
// league-tables.json, discipline-clocks.json) over five GET endpoints. Until M1079 every poll of
// those endpoints re-sent the whole kilobytes again, byte for byte identical, because nothing in the
// response told the reader it already held them. Now each of the five answers with a strong ETag
// that is `sha256-` over the exact contract bytes the process loaded, and an `If-None-Match` naming
// that validator is answered with `304` and an empty body.
//
// WHY A GATE AND NOT JUST THE CODE. A validator is a promise, and a broken promise is worse than no
// promise: an ETag that stays still while the body moves makes caches drop fresh data, and an ETag
// that moves while the body stands still makes the client re-fetch for nothing. Both failures are
// silent — the wire looks healthy either way. So this gate charges four things, from the source:
//
//   1 · POPULATION. Every `@GetMapping` in the reactor is enumerated from the Java text, never
//      counted by hand. The two rosters in domain/platform.ts's HTTP_VALIDATORS must cover that
//      population exactly: a new GET that appears and is in neither roster is red, so the question
//      "is this body frozen?" cannot be skipped by forgetting to ask it.
//   2 · BOTH DIRECTIONS. A guarded handler that loses its `checkNotModified` is red. An unguarded
//      handler that STARTS borrowing a validator is red too — that is the more dangerous direction,
//      because the `/stats` bodies are live counters and would then be cached as if they were frozen.
//   3 · THE REASONS ARE FALSIFIABLE. Each unguarded reason has to name a call that really appears in
//      that handler's own body. A reason that points at nothing is a hiding place, so it is charged
//      as a defect rather than accepted as a comment.
//   4 · THE DIGEST IS THE BYTES. The Java class that produces the value and the JS that re-derives
//      it must agree on the algorithm (`SHA-256`), the encoding (lowercase hex) and the wire prefix
//      (`sha256-`, the same spelling the contract's own `digest` field uses). Two ContractDigest
//      classes serve the two services; they are twins byte-for-byte apart from the package line, and
//      this gate charges that identity so the two services cannot grow two different ideas of what a
//      validator is.
//
// WHAT THIS CANNOT DO. It opens no socket. That the wire header equals this digest, that a matching
// If-None-Match really answers 304 with zero body bytes, and that a wrong tag answers 200 belong to
// scripts/verify-conditional-get-live.mjs — which is a leg of .github/workflows/spring-cloud-live.yml.
// Deliberately absent everywhere, here and on the wire: `Last-Modified`. A classpath entry's
// timestamp is the build's, not the document's, so it would move whenever the jar is repackaged.

import { createServer } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
// hmr:false — a static proof must not bind the shared HMR websocket port (24678); other Vite
// processes on this host legitimately hold it, and competing for it is a source of false reds.
const server = await createServer({
  // PID-unique cacheDir avoids races on the shared .vite deps folder when another Vite process
  // is mid-flight (the parallel Vite dev server I leave running, for example) — M1114's signature.
  cacheDir: join(tmpdir(), `proof-http-validators-vite-${process.pid}`),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});
const { HTTP_VALIDATORS, GATEWAY_ROUTES, PLATFORM_SERVICES, LEAGUE_CONTRACT, DISCIPLINE_CONTRACT, REDIS } =
  await server.ssrLoadModule("/domain/platform.ts");
await server.close();

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- the Java population, derived from source text ---------------------------------------------
// A walker that never enters target/: the built tree holds copies of the same classes, and counting
// them would double the population with bytes nobody edits.
const walkJava = (dir) => {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "target" || e === "node_modules") continue;
    if (statSync(p).isDirectory()) out.push(...walkJava(p));
    else if (e.endsWith(".java")) out.push(p);
  }
  return out;
};
const moduleOf = (abs) => abs.slice(root.length + 1).split(sep)[1];       // services/<module>/…
const files = walkJava(join(root, "services"));
const sig = /^(?:public|protected|private)\s+(.+?)\s+(\w+)\s*\(([^)]*)\)/;

const endpoints = [];   // every @GetMapping in the reactor
const posts = [];       // every @PostMapping — the population a validator must NEVER appear on
const braceBody = (lines, from) => {
  let depth = 0, started = false;
  const out = [];
  for (let i = from; i < lines.length; i++) {
    out.push(lines[i]);
    for (const ch of lines[i]) {
      if (ch === "{") { depth++; started = true; }
      else if (ch === "}") depth--;
    }
    if (started && depth === 0) break;
  }
  return out.join("\n");
};

for (const abs of files) {
  const src = readFileSync(abs, "utf8");
  if (!/@RestController/.test(src)) continue;
  const lines = src.split(/\r?\n/);
  const controller = abs.split(sep).pop().replace(".java", "");
  // The class-level base mapping: the @RequestMapping that appears before the class declaration.
  const classAt = lines.findIndex((l) => /^\s*public\s+(?:final\s+)?class\s/.test(l));
  const base = (() => {
    for (let i = 0; i < classAt; i++) {
      const m = /@RequestMapping\(\s*"([^"]*)"/.exec(lines[i]);
      if (m) return m[1];
    }
    return "";
  })();
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    for (const [tag, bucket] of [["@GetMapping", endpoints], ["@PostMapping", posts]]) {
      const m = new RegExp(`^${tag}(?:\\(\\s*"([^"]*)"\\s*\\))?$`).exec(t);
      if (!m) continue;
      let found = null;
      for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
        const s = sig.exec(lines[j].trim());
        if (s) { found = { at: j, returns: s[1], name: s[2], params: s[3] }; break; }
      }
      if (!found) { bucket.push({ module: moduleOf(abs), controller, handler: "?", route: base + m[1], missing: true }); continue; }
      bucket.push({
        module: moduleOf(abs), controller, handler: found.name,
        route: base + (m[1] ?? ""), params: found.params, returns: found.returns,
        body: braceBody(lines, found.at),
        takesWebRequest: /WebRequest\s+\w+/.test(found.params),
      });
    }
  }
}

const key = (e) => `${e.module}/${e.controller}#${e.handler}`;
const byKey = new Map(endpoints.map((e) => [key(e), e]));
const guarded = HTTP_VALIDATORS.guarded;
const unguarded = HTTP_VALIDATORS.unguarded;
const gKeys = new Set(guarded.map((e) => key(e)));
const uKeys = new Set(unguarded.map((e) => key(e)));
const emitsValidator = (e) => /checkNotModified\s*\(/.test(e.body) && /\.eTag\(/.test(e.body);

// --- 1 · the population is real, and the two rosters cover it exactly ---------------------------
ok(`the census walks ${files.length} Java files under services/ and never enters a target/ copy`,
  files.length >= 12 && files.every((f) => !f.split(sep).includes("target")));
ok(`the census finds ${endpoints.length} @GetMapping endpoints and ${posts.length} @PostMapping ones, and every one of them resolves a handler signature`,
  endpoints.length >= 13 && posts.length >= 3 && [...endpoints, ...posts].every((e) => e.handler !== "?"));
ok(`the ${endpoints.length} GETs split ${guarded.length} guarded + ${unguarded.length} unguarded with no remainder (${guarded.length + unguarded.length})`,
  endpoints.length === guarded.length + unguarded.length && endpoints.length >= 13);
ok(`every roster entry names an endpoint that exists in the source (${[...gKeys, ...uKeys].filter((k) => !byKey.has(k)).join(", ") || "all present"})`,
  [...gKeys, ...uKeys].every((k) => byKey.has(k)) && guarded.length + unguarded.length >= 13);
ok(`the two rosters are disjoint — no endpoint is both promised a validator and excused from one`,
  [...gKeys].every((k) => !uKeys.has(k)) && guarded.length >= 5 && unguarded.length === 8);
ok(`every GET whose own body emits a validator is on the guarded roster (${endpoints.filter((e) => emitsValidator(e) && !gKeys.has(key(e))).map(key).join(", ") || "none"} emit(s) outside the roster)`,
  endpoints.every((e) => !emitsValidator(e) || gKeys.has(key(e))) && endpoints.length >= 13);
ok(`every guarded roster row really does emit one in the source — the descriptor cannot promise a validator the handler stopped sending`,
  guarded.every((e) => emitsValidator(byKey.get(key(e)))));
ok(`every roster module is a declared reactor module (${[...new Set([...guarded, ...unguarded].map((e) => e.module))].join(", ")})`,
  [...new Set([...guarded, ...unguarded].map((e) => e.module))]
    .every((m) => PLATFORM_SERVICES.some((s) => s.module === m)));

// --- 2 · the guarded handlers really answer conditionally --------------------------------------
for (const e of guarded) {
  const got = byKey.get(key(e));
  ok(`${key(e)} takes a WebRequest, checks the validator and publishes it on the 200`,
    got.takesWebRequest && /checkNotModified\(\s*etag\s*\)/.test(got.body) && /\.eTag\(\s*etag\s*\)/.test(got.body));
  ok(`${key(e)} returns the short-circuit (null) when checkNotModified says the reader is current`,
    /if\s*\(request\.checkNotModified\(etag\)\)\s*\{\s*\n?\s*return null;/.test(got.body));
  ok(`${key(e)} answers as a ResponseEntity, so a 304 can carry no body at all`,
    /^ResponseEntity</.test(got.returns));
}
ok(`all ${guarded.length} guarded endpoints sit in the two services that serve frozen contracts (${[...new Set(guarded.map((e) => e.module))].join(", ")})`,
  new Set(guarded.map((e) => e.module)).size === 2 &&
  guarded.every((e) => e.module === "league-service" || e.module === "discipline-service"));

// --- 3 · the excused handlers really abstain, and their reasons point at the source ------------
// The roster's `unguarded` side names WHY a handler is excused in the gate's prose below — English
// prose lives in this proof (and in the dictionaries), never in domain/. Each reason names at
// least one call the handler actually makes, and is charged as a lie otherwise.
const REASONS = {
  "cache-service/LeagueCacheController#summary": "The body is whatever service.readSummary() hands back from Redis, and that can be older than the classpath contract file: a digest taken over the file would then name bytes this response does not contain. Its validator must be computed over the returned bytes, which is the read-through's job, not this controller's.",
  "cache-service/LeagueCacheController#stats": "service.stats() reads live counters — hits, misses, origin loads, coalesced reads — that move between two requests whose validators would then be identical while their bodies are not.",
  "cache-service/LeagueTablesController#list": "Same read-through as the summary: service.listJson() returns the cached document, so the classpath digest is not a digest of these bytes until the cache is invalidated when the exporter rewrites the file.",
  "cache-service/LeagueTablesController#table": "Same read-through as the summary, and service.table(competitionId) answers 404 from a cache lookup whose verdict can change between calls — a validator would have to name the miss as well as the hit.",
  "cache-service/LeagueTablesController#stats": "service.stats() is the second cache's own live counters, so the body moves on its own while any document-derived validator would stand still.",
  "messaging-service/PipelineController#summary": "The body mixes in brokerLive(), a real TCP probe of the broker port whose answer flips between one request and the next; a validator over a frozen document would promise freshness for a fact that just changed.",
  "messaging-service/PipelineController#stats": "pipeline.stats() is the seen-set size and the per-shard load: pure counters, moving with every event the binder takes.",
  "messaging-service/PipelineController#policy": "The body is a boot-time echo of the eight config integers in pipeline.policy(), not an exported world snapshot — a few hundred bytes, so a validator would save almost nothing while adding a second freshness promise to keep true if the config server ever pushes a refresh.",
};
const callTokens = (text) => [...new Set((text.match(/[a-z][A-Za-z0-9_]*\(/g) ?? []).map((s) => s.slice(0, -1)))];
for (const e of unguarded) {
  const got = byKey.get(key(e));
  ok(`${key(e)} carries no validator — its live body must never be promised as frozen`,
    !/checkNotModified/.test(got.body) && !/\.eTag\(/.test(got.body));
  const reason = REASONS[key(e)];
  const named = callTokens(reason).filter((t) => new RegExp(`\\b${t}\\s*\\(`).test(got.body));
  ok(`${key(e)}'s reason (${reason.length} chars) names a call its own handler really makes: ${named.join(", ") || "NONE"}`,
    reason.length >= 100 && named.length >= 1);
}
ok(`the population of GETs that abstain is ${unguarded.length}, all of them counters, read-throughs or a broker probe`,
  unguarded.every((e) => /stats|summary|list|table|policy/.test(e.handler)) && unguarded.length === 8);

// --- 4 · POSTs are outside the validator's grammar entirely ------------------------------------
ok(`none of the ${posts.length} POST handlers borrows a validator (a 304 to a POST would be a protocol error)`,
  posts.every((p) => !/checkNotModified|\.eTag\(/.test(p.body)));

// --- 5 · Last-Modified is absent under every code spelling, and the scan can see it ------------
// Only the spellings that would actually PUT the header on a response are charged. The prose in
// ContractDigest's javadoc names Last-Modified to explain why it is missing, and a gate that read
// that as a violation would be grading the comment instead of the wire.
const LM_SPELLINGS = [/"last-modified"/i, /HttpHeaders\.LAST_MODIFIED/, /setLastModified\s*\(/, /\.lastModified\s*\(/, /LastModifiedValue/, /headers\.setDateHeader\s*\(\s*"last-modified"/i];
const javaAll = files.map((f) => readFileSync(f, "utf8")).join("\n");
const lmHits = LM_SPELLINGS.filter((re) => re.test(javaAll));
ok(`no Java file sets a Last-Modified validator under ${LM_SPELLINGS.length} code spellings (hits: ${lmHits.map(String).join(" ") || "none"}) — a jar timestamp moves while the document does not`,
  lmHits.length === 0);
ok(`…and that absence is armed, not vacuous: every one of the ${LM_SPELLINGS.length} spellings fires on a planted response-building line`,
  LM_SPELLINGS.every((re) => re.test('r.headers.set("Last-Modified", x); HttpHeaders.LAST_MODIFIED; response.setLastModified(t); b.lastModified(t); new LastModifiedValue(t); headers.setDateHeader("last-modified", t);')));

// --- 6 · the digest is derived from the bytes, in both languages, the same way -----------------
const J_LEAGUE = read("services/league-service/src/main/java/com/footballos/league/ContractDigest.java");
const J_DISCIPLINE = read("services/discipline-service/src/main/java/com/footballos/discipline/ContractDigest.java");
const packageLine = (s) => (s.split(/\r?\n/)[0] ?? "").trim();
const bodyOfDigest = (s) => s.split(/\r?\n/).slice(1).join("\n");
ok(`the two ContractDigest classes are twins — byte-identical past the package line (${packageLine(J_LEAGUE)} / ${packageLine(J_DISCIPLINE)})`,
  packageLine(J_LEAGUE) === "package com.footballos.league;" &&
  packageLine(J_DISCIPLINE) === "package com.footballos.discipline;" &&
  bodyOfDigest(J_LEAGUE) === bodyOfDigest(J_DISCIPLINE));
ok(`each ContractDigest hashes the CLASSPATH BYTES of the resource it is handed — no filename, no version string, no timestamp`,
  /new ClassPathResource\(resource\)\.getInputStream\(\)/.test(J_LEAGUE) &&
  /MessageDigest\.getInstance\("SHA-256"\)/.test(J_LEAGUE) &&
  /digest\(bytes\)/.test(J_LEAGUE) && !/lastModified|System\.currentTimeMillis|getVersion/.test(J_LEAGUE));
ok(`the Java names its algorithm in lowercase hex with the ${JSON.stringify(HTTP_VALIDATORS.algorithm)} prefix — exactly what Node's digest("hex") produces`,
  J_LEAGUE.includes(`ALGORITHM = "${HTTP_VALIDATORS.algorithm}"`) && /HexFormat\.of\(\)\.formatHex/.test(J_LEAGUE));
ok(`BOTH copies name that prefix (${[J_LEAGUE, J_DISCIPLINE].map((s) => (s.match(/ALGORITHM = "([^"]*)"/) ?? [, "none"])[1]).join(" / ")}) — a drift shared by the twins is still a drift from the descriptor`,
  [J_LEAGUE, J_DISCIPLINE].every((s) => s.includes(`ALGORITHM = "${HTTP_VALIDATORS.algorithm}"`)));
ok(`both copies state the wildcard boundary in the same words (${[J_LEAGUE, J_DISCIPLINE].map((s) => (/wildcard If-None-Match/.test(s) ? "stated" : "MISSING")).join(" / ")}), and the live witness is named as the one that measures it — a comment nobody tests is a comment that rots`,
  [J_LEAGUE, J_DISCIPLINE].every((s) => /wildcard If-None-Match/.test(s) && /verify-conditional-get-live/.test(s)));
const digestOf = (absRel) => HTTP_VALIDATORS.algorithm + createHash("sha256").update(readFileSync(join(root, absRel))).digest("hex");
const RESOURCES = {
  "league-summary.json": "services/league-service/src/main/resources/league-summary.json",
  "league-tables.json": "services/league-service/src/main/resources/league-tables.json",
  "discipline-clocks.json": "services/discipline-service/src/main/resources/discipline-clocks.json",
};
const digests = Object.fromEntries(Object.entries(RESOURCES).map(([k, p]) => [k, existsSync(join(root, p)) ? digestOf(p) : "missing"]));
ok(`all three frozen documents exist where the roster says and hash to a 64-hex validator each (${Object.entries(digests).map(([k, v]) => `${k}:${v.slice(7, 14)}…`).join(" ")})`,
  Object.values(digests).every((v) => /^sha256-[0-9a-f]{64}$/.test(v)));
ok(`the three validators are distinct — one per document, so a reader cannot confuse a table for a clock`,
  new Set(Object.values(digests)).size === 3);
ok(`every guarded endpoint names a resource that is one of the three frozen documents and is on disk`,
  guarded.every((e) => RESOURCES[e.resource] && existsSync(join(root, RESOURCES[e.resource]))));
ok(`the roster's resources are the SAME files the other descriptors name (LEAGUE_CONTRACT, DISCIPLINE_CONTRACT, REDIS.tablesResource) — no fourth payload smuggled in`,
  guarded.every((e) => e.resource === LEAGUE_CONTRACT.resource || e.resource === DISCIPLINE_CONTRACT.resource ||
    e.resource === REDIS.tablesResource || e.resource === "league-tables.json") &&
  guarded.filter((e) => e.resource === LEAGUE_CONTRACT.resource).length === 1 &&
  guarded.filter((e) => e.resource === "league-tables.json").length === 2 &&
  guarded.filter((e) => e.resource === DISCIPLINE_CONTRACT.resource).length === 2);
ok(`the wire prefix is the contract's own prefix: league-summary.json's digest field starts with ${JSON.stringify(HTTP_VALIDATORS.algorithm)}`,
  JSON.parse(read(LEAGUE_CONTRACT.path)).digest.startsWith(HTTP_VALIDATORS.algorithm));

// --- 7 · the paths the roster promises are the paths the gateway actually routes ---------------
ok(`each guarded endpoint's first path segment is a prefix some gateway route really claims (/api/<segment>/**), so the promised edge exists`,
  guarded.every((e) => {
    const seg = e.route.split("/")[1];
    return GATEWAY_ROUTES.some((r) => r.path === `/api/${seg}/**` || r.path.startsWith(`/api/${seg}/`));
  }));
ok(`the sample competition ids the roster prints (ucl) are ids the frozen documents really carry`,
  Object.keys(JSON.parse(read(RESOURCES["league-tables.json"])).tables).includes("ucl") &&
  Object.keys(JSON.parse(read(RESOURCES["discipline-clocks.json"])).clocks).includes("ucl"));
ok(`every guarded viaGateway path is "/api" + its direct route (the templated ones dialled with a real id), so the atlas prints a path a reader can actually dial`,
  guarded.every((e) => {
    if (!e.route.includes("{")) return e.viaGateway === "/api" + e.route;
    const head = e.route.split("{")[0];
    return e.viaGateway === "/api" + head + "ucl" && e.route.includes("{competitionId}");
  }));

// --- 8 · the descriptor is read by the UI, not only by this gate -------------------------------
const ATLAS = read("features/platform/PlatformAtlas.tsx");
ok(`the atlas imports HTTP_VALIDATORS and prints the guarded roster itself, not a hand-typed count`,
  ATLAS.includes("HTTP_VALIDATORS") && /HTTP_VALIDATORS\.guarded\.length/.test(ATLAS) &&
  /HTTP_VALIDATORS\.guarded\.map\(\(e\) => e\.viaGateway\)\.join/.test(ATLAS));
const DICT = read("i18n/dictionaries.ts");
for (const k of ["platform.validatorLine", "platform.validatorBoundary"]) {
  const lines = DICT.split(/\r?\n/).filter((l) => l.trim().startsWith(`"${k}"`));
  const filled = lines.filter((l) => l.split(/":\s*"/)[1]?.replace(/",?\s*$/, "").length > 40);
  ok(`${k} is present in exactly 3 locales and every one of them says something (${lines.length} lines, ${filled.length} non-trivial)`,
    lines.length === 3 && filled.length === 3);
}
ok(`platform.validatorLine's placeholders match the arguments the atlas passes ({n} and {algorithm})`,
  /"platform\.validatorLine": "[^"]*\{n\}[^"]*\{algorithm\}[^"]*"/.test(DICT) &&
  !/"platform\.validatorLine": "[^"]*\{(?!n\}|algorithm\})[a-zA-Z]+/.test(DICT));

// --- 9 · the live witness holds up its end -----------------------------------------------
const WITNESS = read("scripts/verify-conditional-get-live.mjs");
ok(`the live witness exists and is a witness, not a comment (${WITNESS.length} chars)`,
  WITNESS.length > 3000);
ok(`the witness re-derives the expected validator in Node over the resource bytes — it does not read the wire value and send it back, which would prove only that the server echoes itself`,
  /createHash\("sha256"\)/.test(WITNESS) && /\.digest\("hex"\)/.test(WITNESS) &&
  /const PREFIX = "sha256-"/.test(WITNESS));
const dialed = (e) => e.route.replace("{competitionId}", "ucl");
ok(`the witness dials all ${guarded.length} guarded paths directly AND every one of them through the gateway`,
  guarded.every((e) => WITNESS.includes(dialed(e)) && WITNESS.includes(e.viaGateway)));
ok(`the witness asserts all five conditional-GET facts: 200 carries the validator, a matching tag answers 304, the 304 body is EMPTY, a wrong tag answers 200 with the full body, and the wildcard is answered 200 too`,
  WITNESS.includes("checkNotModified") === false && /status === 304/.test(WITNESS) && /status === 200/.test(WITNESS) &&
  /(text\.length === 0|body\.length === 0)/.test(WITNESS) && /if-none-match/i.test(WITNESS) &&
  /"If-None-Match": "\*"/.test(WITNESS));
ok(`the witness compares a projected document by CONTENT, not by byte order: it canonicalises object keys and declares which arrays it reads as sets (${(WITNESS.match(/setFields: \["competitions"\]/g) ?? []).length} list endpoints) — so a red there means different facts, never a different key order`,
  /const canon = /.test(WITNESS) && /setFields\.includes\(k\)/.test(WITNESS) &&
  (WITNESS.match(/setFields: \["competitions"\]/g) ?? []).length === 2);
ok(`the witness checks Last-Modified is absent on the wire too, and MEASURES the bytes a 304 saves instead of declaring a number`,
  /last-modified/i.test(WITNESS) && /text\.length/.test(WITNESS) && /saved/.test(WITNESS));
ok(`the witness boots only project-owned jars, kills every child on exit, and refuses outright when no port plan is free — it will not attest to a foreign stack's headers`,
  /-jar/.test(WITNESS) && /no port plan is free/.test(WITNESS) && /offenders/.test(WITNESS) &&
  /kill\(/.test(WITNESS) && /process\.on\("exit"/.test(WITNESS));
ok(`the witness moves its WHOLE plan or none of it: one uniform shift over every boot port, checked as a single delta — a service shifted around a foreign stack while still dialling the host's registry would register into a stranger's`,
  /DETAILS\[id\]\.port \+ shift/.test(WITNESS) && /SHIFTS/.test(WITNESS) &&
  /new Set\(BOOT_IDS\.map\(\(id\) => P\[id\] - DETAILS\[id\]\.port\)\)\.size === 1/.test(WITNESS));
ok(`the witness hands its own children the registry and config server it booted (--server.port plus both URLs from the plan), and takes that duty from each child's own yml rather than a typed list`,
  /--server\.port=\$\{P\[id\]\}/.test(WITNESS) &&
  /serviceUrl\.defaultZone=http:\/\/localhost:\$\{P\.registry\}/.test(WITNESS) &&
  /configserver:http:\/\/localhost:\$\{P\.config\}/.test(WITNESS) &&
  /includes\("defaultZone"\)/.test(WITNESS) && /includes\("optional:configserver:"\)/.test(WITNESS));
ok(`no URL the witness dials hardcodes a boot port — every fetch goes through the plan, so a re-based run cannot judge a socket it did not open`,
  /http:\/\/localhost:\$\{P\./.test(WITNESS) && !/http:\/\/localhost:[0-9]/.test(WITNESS));
ok(`the witness reflects its own tally in the exit code — a FAIL line cannot be printed under exit 0`,
  /process\.exit\(fail \? 1 : 0\)|process\.exit\(fail\s*\?\s*1/.test(WITNESS));

// --- 10 · the gate is in the suite, and the CI leg names it ------------------------------------
const PROOF_FILES = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
ok(`this gate is a suite member by the runner's own rule (/^proof-(.+)\.mjs$/) — ${PROOF_FILES.length} proofs`,
  PROOF_FILES.includes("proof-http-validators.mjs") && PROOF_FILES.length >= 42);
const WF = read(".github/workflows/spring-cloud-live.yml");
ok(`the live leg runs this milestone's witness in the CI job that boots the stack`,
  WF.includes("verify-conditional-get-live.mjs"));
const WF_PROOF = read("scripts/proof-workflows.mjs");
ok(`the workflow gate counts the live legs, so the new one is charged there too (${WF_PROOF.length} chars)`,
  /spring-cloud-live/.test(WF_PROOF) && WF_PROOF.length > 3000);

console.log(`\nproof-http-validators: ${pass}/${pass + fail} checks passed — ${endpoints.length} GETs (${guarded.length} guarded), ${posts.length} POSTs, 3 frozen documents`);
process.exit(fail ? 1 : 0);
