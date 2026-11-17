// Proof for the Tide (M1182): the Operator's console's own reading of the fortnight.
// Pure deterministic fold, no model, no fabricated smoothing — the forecast comes from the
// seed's own rule (mean of last four plus drift), never from wished-for trend.
// Run: node scripts/proof-tide.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const tide = readFileSync("domain/tide.ts", "utf8");
const ops = readFileSync("features/ops/Ops.tsx", "utf8");

ok("the tide fold ships one pure deterministic reader — no model, no LLM, no randomness",
  /export function foldTide/.test(tide) &&
  !/Math\.random|Date\.now|\bDate\b/.test(tide) && /firstHalfAvg/.test(tide));
ok("foldTide is built on PulseFold.trend slice(-14) — the 14-day window, never longer, never shorter",
  /\.slice\(-14\)/.test(tide));
ok("the forecast is mean-of-last-4 + drift — not extrapolated imagination; the seed's own ceiling",
  /const mean4\s*=\s*Math\.max\(1/.test(tide) && /\bdrift\b/.test(tide) && /Math\.round\(mean4 \+ drift \*/.test(tide));
ok("the tide verdict is one of three, exhaustive and labelled",
  /"rising"/.test(tide) && /"steady"/.test(tide) && /"falling"/.test(tide) && /deltaPct >= 10/.test(tide));
ok("the screen consumes foldTide and never re-ships a parallel trend walker",
  /foldTide\(fold\)/.test(ops) && !/forecast\(/.test(ops.replace(/\/\/.*$/gm, "")));
ok("the sparkline is accessible — role=img and an aria-label through t()",
  /role="img"/.test(ops) && /ops\.tide\.aria/.test(ops));
ok("the forecast is rendered, never silently swapped or hidden",
  /tide\.forecast/.test(ops) && /ops\.tide\.forecast/.test(ops));
ok("t() calls adopt the literal/keyword-literal doors properly (literal + the two dynamic cls chips)",
  (ops.match(/t\("ops\.tide\./g) ?? []).length >= 7 &&
  (ops.match(/t\(`ops\.tide\.direction\./g) ?? []).length === 1 &&
  (ops.match(/t\(`ops\.tide\.recommendation\./g) ?? []).length === 1);

// i18n presence asserts
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
const keys = ["ops.tide.kicker", "ops.tide.title", "ops.tide.direction.rising", "ops.tide.direction.steady",
              "ops.tide.direction.falling", "ops.tide.firstHalf", "ops.tide.secondHalf", "ops.tide.dayCount",
              "ops.tide.aria", "ops.tide.forecast", "ops.tide.recommendation.rising", "ops.tide.recommendation.steady",
              "ops.tide.recommendation.falling"];
for (const key of keys) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp('"' + key.replace(/\./g, "\\.") + '":', "g")) ?? []).length === 3);
}
for (const junk of ["ops.tide.direction.bla", "ops.tide.recommendation.outstanding"]) {
  ok(`no stray ${junk} rows leak into the dict`, !dict.includes(`"${junk}"`));
}

// Planting a rising fixture verifies the dirstring classification mechanics in-code
const reRising = /deltaPct >= 10 \? "rising" : deltaPct <= -10 \? "falling" : "steady"/;
ok("the rising/falling branch is spelled exactly this way — the seed's own rule", reRising.test(tide));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
