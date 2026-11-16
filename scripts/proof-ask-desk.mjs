// Proof for Ask the Wire (M1163). The three preset questions ride inside the wire's brief
// panel exactly as the wire's own brief does — this checks the doors align them: the
// artifact guard, the streaming door, the imprisoned system prompt, i18n in three locales,
// and the no-domain-prose / no-*Key bypass rules the rest of the tree already holds.
// Run: node scripts/proof-ask-desk.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const wire = readFileSync("public/live-wire.json", "utf8");
ok("the committed wire is live-wire/v3, required by every wireAskSystem branch",
  (() => { try { return JSON.parse(wire).schema === "live-wire/v3"; } catch { return false; } })());

// The desk lives in the screen (as the wire's own brief does); no domain module carries it.
ok("no domain/askDesk.ts exists — the desk ships inside the screen, so the domain-prose ceiling holds at 0",
  !existsSync("domain/askDesk.ts"));

const src = readFileSync("features/livewire/LiveWire.tsx", "utf8");
ok("three presets ship with three distinct ids",
  ["nextRound", "titleChase", "wonderTable"].every((id) => src.includes(`id: "${id}"`)));
ok("three presets carry their own ask string, none empty",
  (src.match(/ask: "Tell the reader/g) ?? []).length >= 2 &&
  src.includes('ask: "For every league in the file'));

ok("the desk's preset chips render through the live dynamic site (w.id), not a *Key field",
  src.includes("{t(`liveWire.askDesk.${w.id}.kicker`)}") && !/\w+Key:/.test(src.slice(src.indexOf("const WIRE_ASKS"), src.indexOf("const wireAskSystem"))));

ok("the streaming kicker reads through the live dynamic site (askId)",
  (src.match(/t\(`liveWire\.askDesk\.\$\{askId\}\.kicker`\)/g) ?? []).length === 2);

ok("the streaming wire asks through the ONE streaming door (callLlmStream), with the preset's ask as the message",
  /callLlmStream\(\s*ws\.ask/.test(src));

ok("the system prompt is resolved from the SAME committed artifact the page renders — never a separate source",
  /wireAskSystem\(payload, ws, locale\)/.test(src) && /FOLD:/.test(src));

ok("the season total rides the shared sum() door, not an inline fold",
  !/p\.leagues\.reduce\(\(n/.test(src) && src.includes("sum(p.leagues"));

ok("the imprisoned system names only file-carried facts: table, points, goal-difference, upcoming — never news, injuries or suspensions",
  /top: l\.table\.slice\(0, 5\)/.test(src) && /upcoming: l\.upcoming\.slice\(0, 3\)/.test(src) &&
  !/injury|suspension|newsFeed|headline/i.test(src));
ok("the no-invention clause is pinned in the prompt",
  src.includes("Never invent a match, club or result") && src.includes("say exactly that and stop"));

ok("the panel renders kicker, title and subtitle as literal keys",
  src.includes('t("liveWire.askDesk.kicker")') && src.includes('t("liveWire.askDesk.title")') && src.includes('t("liveWire.askDesk.subtitle")'));
ok("exactly one ask button renders per preset, with aira-pressed on the active one",
  (src.match(/WIRE_ASKS\.map\(\(w\) =>/g) ?? []).length === 1 && src.includes("aria-pressed={askId === w.id}"));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["liveWire.askDesk.kicker", "liveWire.askDesk.title", "liveWire.askDesk.subtitle",
                   "liveWire.askDesk.nextRound.kicker", "liveWire.askDesk.titleChase.kicker", "liveWire.askDesk.wonderTable.kicker"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}
for (const key of ["nextRound.cta", "titleChase.cta", "wonderTable.cta", "nextRound.body", "titleChase.body", "wonderTable.body"]) {
  ok(`no unused ${key} rows linger in the dictionary (coined-then-dropped, all three locales)`,
    !dict.includes(`"liveWire.askDesk.${key}"`));
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
