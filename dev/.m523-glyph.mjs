// M523 diagnostic — which learned-simplified glyphs do the new zh-TW coach.* rows carry?
import { createServer } from "vite";
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const D = (await server.ssrLoadModule("/i18n/dictionaries.ts")).DICTIONARIES;
const zhKeys = Object.keys(D["zh-CN"]);
const rateIn = (dict, ch) => zhKeys.filter((k) => String(dict[k]).includes(ch)).length;
const corpusChars = new Set();
for (const k of zhKeys) for (const ch of String(D["zh-CN"][k]) + String(D["zh-TW"][k])) if (/[㐀-鿿]/.test(ch)) corpusChars.add(ch);
const learnedGlyphs = [...corpusChars].filter((ch) => {
  const rc = rateIn(D["zh-CN"], ch);
  return rc >= 8 && rateIn(D["zh-TW"], ch) * 10 <= rc;
});
const leakSet = new Set(learnedGlyphs);
const coachKeys = zhKeys.filter((k) => k.startsWith("coach.") || k === "nav.coach" || k === "set.key.coach");
for (const k of coachKeys) {
  const v = String(D["zh-TW"][k]);
  const leaks = [...v].filter((ch) => leakSet.has(ch));
  if (leaks.length) console.log(`${k} = ${v}  leaks: ${[...new Set(leaks)].join(" ")} (zh-CN rates: ${[...new Set(leaks)].map((ch) => `${ch}:${rateIn(D["zh-CN"], ch)}`).join(" ")})`);
}
console.log(`learned set size: ${learnedGlyphs.length}; coach keys: ${coachKeys.length}`);
await server.close();
