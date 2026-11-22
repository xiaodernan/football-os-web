// M1241 · The Ops Trend: proof for the operator console's forecast and advice.
// Run: node scripts/proof-opstrend.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-opstrend-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/opsTrend.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { trendRead, nextDay, FORECAST_WINDOW, CONTENT_DECLINE_PCT, HIGH_LOOP_SHARE, LOW_DEPTH } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const day = (n) => `2026-08-${String(n).padStart(2, "0")}`;
const series = [
  ...[90, 100, 110, 95, 105, 100, 100].map((v, i) => ({ day: day(i + 1), visits: v })),
  ...[70, 80, 90, 75, 85, 80, 80].map((v, i) => ({ day: day(i + 8), visits: v })),
];
const read = trendRead({ trend: series, bounceRate: 62, avgDepth: 1.4, loopRate: 25 });

ok(`the hand-counted fortnight reads week 80.00 / previous 100.00 / slope -20.00% (${read.weekAvg} / ${read.prevAvg} / ${read.slopePct}%, ${read.days} days)`,
  read.weekAvg === 80 && read.prevAvg === 100 && read.slopePct === -20 && read.days === 14);

ok(`the projection walks the slope from the week's mean for seven clamped days (${read.forecast.map((d) => `${d.day.slice(5)}:${d.visits}`).join(" ")})`,
  read.forecast.length === FORECAST_WINDOW &&
  read.forecast[0].day === day(15) && read.forecast[0].visits === 77.14 &&
  read.forecast[6].day === day(21) && read.forecast[6].visits === 60 &&
  read.forecast.every((d) => d.visits >= 0));

// A rising fortnight projects upward; a zero previous window projects flat at the week's mean.
const rising = trendRead({ trend: [...series].map((d, i) => ({ ...d, visits: i < 7 ? 50 : 100 })), bounceRate: 5, avgDepth: 3, loopRate: 5 });
const flat = trendRead({ trend: series.map((d, i) => ({ ...d, visits: i < 7 ? 0 : 60 })), bounceRate: 5, avgDepth: 3, loopRate: 5 });
ok(`a rising fortnight projects upward and a zero previous window projects flat rather than dividing by zero (rising ${rising.slopePct}% -> ${rising.forecast[0].visits}; flat ${flat.slopePct}% -> ${flat.forecast[0].visits})`,
  rising.slopePct === 100 && rising.forecast[0].visits === 107.14 && flat.slopePct === 0 && flat.forecast[0].visits === 60);

// The advice rules, each on its own measured number, in rule order.
ok(`each advice rule fires on its own measured number, in rule order (${read.advice.map((a) => `${a.code}:${a.measure}`).join(" · ")})`,
  JSON.stringify(read.advice) === JSON.stringify([
    { code: "onboarding", measure: 62 },
    { code: "navigation", measure: 1.4 },
    { code: "content", measure: -20 },
    { code: "engagement", measure: 25 },
  ]));
const healthy = trendRead({ trend: series.map((d, i) => ({ ...d, visits: i < 7 ? 60 : 80 })), bounceRate: 12, avgDepth: 3.5, loopRate: 8 });
ok(`a healthy fortnight answers the healthy code with the week's mean as its measure (${healthy.advice.map((a) => `${a.code}:${a.measure}`).join(",")})`,
  healthy.advice.length === 1 && healthy.advice[0].code === "healthy" && healthy.advice[0].measure === 80 && healthy.slopePct > CONTENT_DECLINE_PCT);

// The thresholds are the named constants, and the boundaries are exact.
const atBounce = trendRead({ trend: series, bounceRate: 50, avgDepth: 3, loopRate: 5 });
const atLoop = trendRead({ trend: series, bounceRate: 5, avgDepth: 3, loopRate: 20 });
const atDecline = trendRead({ trend: [...series].map((d, i) => ({ ...d, visits: i < 7 ? 100 : 90.01 })), bounceRate: 5, avgDepth: 3, loopRate: 5 });
ok(`the boundaries are exact — a 50% bounce and a 20% loop fire, a 1.99 depth and a -9.99% week do not (${atBounce.advice.map((a) => a.code).join(",")} / ${atLoop.advice.map((a) => a.code).join(",")} / ${atDecline.advice.map((a) => a.code).join(",")}; thresholds ${CONTENT_DECLINE_PCT}/${HIGH_LOOP_SHARE}/${LOW_DEPTH})`,
  atBounce.advice.some((a) => a.code === "onboarding") && atLoop.advice.some((a) => a.code === "engagement") &&
  !atDecline.advice.some((a) => a.code === "content") && atDecline.advice[0].code === "healthy" &&
  Math.abs(atDecline.slopePct + 9.99) < 0.01);

// An empty series reads empty rather than NaN, and nextDay walks UTC.
const empty = trendRead({ trend: [], bounceRate: 0, avgDepth: 0, loopRate: 0 });
ok(`an empty series reads zeros and a healthy advice rather than NaN (${empty.weekAvg}/${empty.prevAvg}/${empty.slopePct}, ${empty.forecast.length} days from ${empty.forecast[0].day}, ${empty.advice[0].code})`,
  empty.weekAvg === 0 && empty.prevAvg === 0 && empty.slopePct === 0 &&
  empty.forecast.length === 7 && empty.forecast[0].day === "1970-01-02" && empty.advice[0].code === "healthy" &&
  nextDay("2026-02-28") === "2026-03-01" && nextDay("2026-12-31") === "2027-01-01" && nextDay("bad") === "bad");

// The screen reads the catalogue: the static labels in full, and the advice codes through the
// two dynamic prefixes whose value space is the domain's own union — every code keyed in every
// locale, placeholders agreeing, exactly as the i18n gate's dynamic-site rule demands.
const screen = readFileSync(join(process.cwd(), "features/ops/Ops.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\("(ops\.trend\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
const adviceCodes = ["onboarding", "navigation", "content", "engagement", "healthy"];
const adviceKeys = adviceCodes.flatMap((c) => [`ops.trend.advice.${c}`, `ops.trend.advice.${c}.note`]);
ok(`the panel's ${keys.length} static labels are dictionary keys in all three locales with agreeing placeholders (${keys.join(",")})`,
  keys.length >= 4 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) && screen.includes("trendRead("));
ok(`the ${adviceKeys.length} advice keys behind the two dynamic prefixes are keyed in every locale with agreeing placeholders`,
  adviceKeys.every((k) => locales.every((l) => typeof D[l][k] === "string" && D[l][k].trim().length > 0)) &&
  adviceKeys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
