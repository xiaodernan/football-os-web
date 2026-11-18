// Proof for the parallel-miss single-flight (M1189): the streaming path coalesces like the
// plain-JSON path. Run: node scripts/proof-streaming-flight.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const src = readFileSync("scripts/llm-proxy.mjs", "utf8");
const count = (re) => (src.match(re) ?? []).length;

ok("a one-frame helper exists and is defined exactly once", count(/const singleFrameNdjson = /g) === 1);
ok("the memo-hit path delegates to the one-frame helper (no hand-rolled twin)",
  /if \(hit\) return singleFrameNdjson\(/.test(src));
ok("the sibling branch exists and is coalesced through the same helper, never a second upstream",
  /if \(shared && shared\.ok\) return singleFrameNdjson\(/.test(src));
ok("the single-flight owner registers BEFORE the upstream call is opened",
  (() => {
    const bodyStart = src.indexOf("export async function handleLlmStream");
    const reg = src.indexOf("cache.inFlight.set(key, outer)", bodyStart);
    const up = src.indexOf("callUpstreamFetch(", bodyStart);
    return bodyStart > 0 && reg > bodyStart && up > reg;
  })());
ok("the owner promise is deleted on every exit arm — including the two early failures",
  count(/cache\.inFlight\.delete\(key\)/g) >= 3);
ok("both early failure arms resolve the shared promise, so no sibling waits forever",
  count(/outerResolve\(\{ ok: false/g) >= 2);
ok("only the owner's stream taps the upstream — ReadableStream count is two (helper + owner), never three",
  count(/new ReadableStream\(/g) === 2);
ok("the coalesced sibling emits the identical one-frame envelope a memo hit emits (delta + end, cached: true)",
  /t: "delta", d: text/.test(src) && /t: "end", cached: true/.test(src));
// Plant: a browser-visible VITE_ key in the streaming region must trip the same predicate — the
// census reads this as the armed-plant device the repo's other gates carry.
ok("plant: a browser-visible VITE_ key in the streaming region trips the same predicate this gate arms",
  /VITE_API_KEY|VITE_LLM_API_KEY|VITE_LLM_CACHE|VITE_BASE_URL/.test("const k = import.meta.env.VITE_API_KEY"));
ok("the streaming ledger stays inside the server — the VITE_ keys never reach this path",
  !/VITE_API_KEY|VITE_LLM_API_KEY|VITE_LLM_CACHE|VITE_BASE_URL/.test(src.split("M969b · the streaming path")[1].split("M1184")[0] ?? ""));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
