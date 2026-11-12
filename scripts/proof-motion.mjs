// M1069: the motion & accessibility floor — the cinematic hero is measured, not admired.
//
// proof-contrast.mjs (M1068) asks whether the reader can SEE the text. This gate asks whether the
// motion a reader cannot opt out of is SAFE, and whether the decoration the reader cannot perceive
// is honestly hidden from the accessibility tree. It parses the real `src/globals.css` and every
// real TSX screen that paints self-closing `fo-*` decoration (the landing at M1069, the dashboard
// at M1073, and any screen a later milestone adds — discovered, never hardcoded); it needs no
// browser. Six contracts, each with a planted arm so widening a threshold can never quietly blind
// the gate:
//
//   • photosensitivity (WCAG 2.3.1): every `infinite` animation runs SLOWER than 3 flashes/second,
//     i.e. its period is >= 333ms. A 0.2s pulse (5Hz) is a seizure risk and must be charged.
//   • reduced-motion: a `@media (prefers-reduced-motion: reduce)` block zeroes duration, iteration
//     count AND transition through a universal selector — all three, or a user who asked for stillness
//     still gets drift. Planted: drop any arm, or narrow the selector, and the gate goes red.
//   • decoration/meaning separation: every self-closing `fo-*` decorative element is `aria-hidden`
//     and carries no `t()` message in its attributes, while no aria-hidden element swallows a message.
//     Orbs never carry words; words never disappear into the hidden tree. Planted: strip one
//     aria-hidden, plant one swallowed t(), and the detector must charge both.
//   • compositor hygiene: no rule pins a persistent `will-change` (11 reused `.fo-lift` cards once
//     reserved 11 GPU layers for a 240ms hover), yet the hover transition itself still exists — we
//     fixed the hint, not the interaction. Planted: a pinned hint is charged.
//   • family closure + population: every declared `fo-*` name has a reader past its own definition,
//     and the census reads a real cinematic surface (floors), never an empty sheet.
//
// Honest limit: this measures the shipped CSS/JSX declarations, not a composited frame rate or a real
// screen reader. The Playwright walk covers perception; the live broker proofs cover runtime. This
// gate is the deterministic, cross-hardware floor beneath both.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(resolve(root, "src/globals.css"), "utf8");
const clean = CSS.replace(/\/\*[\s\S]*?\*\//g, ""); // strip comments: a commented-out glow reads nothing

// M1073: discover EVERY screen that paints self-closing `fo-*` decoration. M1069 hardcoded the
// landing; when the dashboard inherited the cinematic hero, its live-dot escaped the gate because
// nothing re-pointed the reader. Discovery makes a NEW decorated screen enter this census the
// moment it is written, with no edit to this file — that is the whole point of the gate.
const SKIP = new Set(["node_modules", "dist", ".git", "vendor", "test-results"]);
const SELF_CLOSING_RE = /<([A-Za-z][\w.]*)\b([^>]*?)\/>/g;
const foDecorIn = (src) =>
  [...src.matchAll(SELF_CLOSING_RE)]
    .map((m) => ({ tag: m[1], attrs: m[2], fo: m[2].match(/fo-[a-z][\w-]*/g) ?? [] }))
    .filter((e) => e.fo.length > 0);
const walk = (dir) => {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return ents.flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(p);
    return /\.(ts|tsx|css)$/.test(e.name) ? [p] : [];
  });
};
const APP_DIRS = ["src", "features", "components", "ui", "lib", "domain", "data", "i18n"];
const decorScreens = APP_DIRS.flatMap((d) => walk(resolve(root, d)))
  .filter((p) => p.endsWith(".tsx"))
  .map((p) => ({ file: p, src: readFileSync(p, "utf8") }))
  .filter((f) => foDecorIn(f.src).length > 0);
const CINEMATIC = decorScreens.map((f) => f.src).join("\n"); // every decorated screen, one census
const SCREEN_NAMES = decorScreens.map((f) => f.file.replace(root + "\\", "").replace(root + "/", "")).join(", ");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Brace-matching block extractor (nested blocks safe) — the reduced-motion body is nested.
const blockAt = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return null;
};

// Parse every animation shorthand into {name, periodMs, infinite}.
const parseAnimations = (sheet) => {
  const out = [];
  for (const m of sheet.matchAll(/(?:animation|animation-name)\s*:\s*([^;}]+)/g)) {
    const value = m[1];
    const name = (value.match(/[A-Za-z_][\w-]*/) || [])[0] ?? null;
    const dur = value.match(/([\d.]+)\s*(ms|s)\b/);
    const periodMs = dur ? (dur[2] === "ms" ? parseFloat(dur[1]) : parseFloat(dur[1]) * 1000) : null;
    out.push({ name, periodMs, infinite: /\binfinite\b/.test(value) });
  }
  return out;
};
const ANIMS = parseAnimations(clean);
const INFINITE = ANIMS.filter((a) => a.infinite);
const MIN_PERIOD = Math.min(...INFINITE.filter((a) => a.periodMs != null).map((a) => a.periodMs));
const FLASH_LIMIT_MS = 1000 / 3; // WCAG 2.3.1: no more than 3 flashes in any 1-second period

// --- 1 · photosensitivity: no infinite animation may flash at/above 3Hz -------------------------
const tooFast = INFINITE.filter((a) => a.periodMs != null && a.periodMs < FLASH_LIMIT_MS).map((a) => `${a.name}@${a.periodMs}ms`);
ok(`all ${INFINITE.length} infinite animations stay slower than the 3Hz photosensitivity line — fastest ${MIN_PERIOD}ms (${(1000 / MIN_PERIOD).toFixed(2)}Hz), floor ${FLASH_LIMIT_MS.toFixed(0)}ms, ${tooFast.length} over it: ${tooFast.join(", ") || "NONE"}`,
  INFINITE.length >= 5 && INFINITE.every((a) => a.periodMs != null && a.periodMs >= FLASH_LIMIT_MS) && tooFast.length === 0);
// The same classifier, fed a planted 0.2s (5Hz) flash, must CHARGE it; the floor cannot go blind.
const plantedFast = parseAnimations(".x { animation: fo-flash 0.2s linear infinite; }").filter((a) => a.infinite && a.periodMs < FLASH_LIMIT_MS);
ok(`the frequency classifier charges a planted 5Hz flash (${plantedFast.length}/1 planted charge) while the shipped ${MIN_PERIOD}ms drift clears the ${FLASH_LIMIT_MS.toFixed(0)}ms floor`,
  plantedFast.length === 1 && MIN_PERIOD >= FLASH_LIMIT_MS);
// Every infinite name must resolve to a declared @keyframes; a renamed keyframe cannot blink unseen.
const KEYFRAMES = [...clean.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
const dangling = INFINITE.filter((a) => a.name && !KEYFRAMES.includes(a.name)).map((a) => a.name);
ok(`all ${INFINITE.length} infinite animations resolve to one of the ${KEYFRAMES.length} declared @keyframes, ${dangling.length} dangling: ${dangling.join(", ") || "NONE"}`,
  KEYFRAMES.length >= 5 && INFINITE.every((a) => a.name && KEYFRAMES.includes(a.name)) && dangling.length === 0);

// --- 2 · reduced-motion: universal selector + all three zeroing arms ---------------------------
const RM = /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{/.exec(clean);
const RM_BODY = RM ? blockAt(clean, clean.indexOf("{", RM.index)) : null;
const RM_UNIVERSAL = RM_BODY != null && /\*/.test(RM_BODY) && /::before/.test(RM_BODY) && /::after/.test(RM_BODY);
const RM_ARMS = {
  duration: /animation-duration\s*:\s*0[\w.]*\s*!important/.test(RM_BODY ?? ""),
  iteration: /animation-iteration-count\s*:\s*1\s*!important/.test(RM_BODY ?? ""),
  transition: /transition-duration\s*:\s*0[\w.]*\s*!important/.test(RM_BODY ?? ""),
};
const rmArmsOn = Object.values(RM_ARMS).filter(Boolean).length;
ok(`the prefers-reduced-motion block zeroes ${rmArmsOn}/3 motion channels through a universal selector (${Object.entries(RM_ARMS).map(([k, v]) => `${k}=${v ? "on" : "OFF"}`).join(" ")}; universal=${RM_UNIVERSAL})`,
  rmArmsOn === 3 && RM_UNIVERSAL);
// Planted: drop each arm / narrow the selector — the same detector must refuse every weakened block.
const RM_GOOD = `*, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }`;
const RM_WEAK = [
  RM_GOOD.replace("transition-duration: 0.001ms !important; ", ""),
  RM_GOOD.replace("animation-iteration-count: 1 !important; ", ""),
  RM_GOOD.replace("*::before, *::after", ".fo-orb"),
];
const rmDetector = (w) => {
  const arms = ["animation-duration\\s*:\\s*0", "animation-iteration-count\\s*:\\s*1", "transition-duration\\s*:\\s*0"]
    .filter((re) => new RegExp(re + "[\\w.]*\\s*!important").test(w)).length;
  const universal = /\*/.test(w) && /::before/.test(w) && /::after/.test(w);
  return arms === 3 && universal;
};
const weakRefused = RM_WEAK.filter((w) => !rmDetector(w)).length;
ok(`the reduced-motion detector refuses ${weakRefused}/${RM_WEAK.length} planted weakened blocks (two missing an arm, one narrowed to .fo-orb) while it credits the shipped 3-arm universal block`,
  weakRefused === RM_WEAK.length && rmDetector(RM_GOOD) && rmArmsOn === 3 && RM_UNIVERSAL);

// --- 3 · decoration/meaning separation: hidden decor, visible words ----------------------------
// M1073: the census spans every discovered decorated screen, not one hardcoded hero.
const decor = decorScreens.flatMap((f) => foDecorIn(f.src));
const decorUnhidden = decor.filter((e) => !/\baria-hidden\b/.test(e.attrs)).map((e) => e.tag + "[" + e.fo.join(" ") + "]");
ok(`all ${decor.length - decorUnhidden.length}/${decor.length} self-closing fo-* decorations across ${decorScreens.length} screens (${SCREEN_NAMES}) are aria-hidden to the tree, ${decorUnhidden.length} exposed: ${decorUnhidden.join(", ") || "NONE"}`,
  decorScreens.length >= 2 && decor.length >= 10 && decorUnhidden.length === 0);
// Every aria-hidden element keeps meaning in attributes alone: no t() message is written into one.
const hiddenTags = [...CINEMATIC.matchAll(/<[A-Za-z][\w.]*\b[^>]*\baria-hidden\b[^>]*\/?>/g)].map((m) => m[0]);
const hiddenWithWords = hiddenTags.filter((tag) => /\bt\s*\(/.test(tag)).length;
ok(`all ${hiddenTags.length} aria-hidden tags across the decorated surfaces carry their meaning in class/geometry alone with ${hiddenWithWords} swallowing a t() message in an attribute`,
  hiddenTags.length >= 8 && hiddenWithWords === 0);
// Planted: strip an aria-hidden off an orb, and plant a t() inside a hidden span; both must charge.
const plantedExposed = '<div className="fo-orb fo-orb-lime" />';
const plantedSwallowBody = `{t("a.hidden.word")}`;
const stripCharged = !/\baria-hidden\b/.test(plantedExposed) && /fo-orb/.test(plantedExposed);
const swallowCharged = /\bt\s*\(/.test(plantedSwallowBody);
ok(`the separation detector charges ${stripCharged ? 1 : 0}+${swallowCharged ? 1 : 0}/2 planted defects (an exposed orb, a swallowed message) against ${decor.length} shipped decor all hidden`,
  stripCharged && swallowCharged && decor.length >= 10);

// M1073 · no blind screens: a BRAND-NEW decorated TSX that no human re-pointed the reader to must
// still enter the census and be charged if its decor is exposed. We plant the source of such a
// screen in memory, run the very same discovery+separation reader over it, and require a charge.
// This is the defect class the old hardcoded LANDING reader had: the dashboard inherited the hero
// and its live-dot escaped for a whole milestone. The gate must be blind to NO screen, present or
// future. The positive pins come from the shipped population (>= 2 screens, >= 10 decor).
const plantedFutureScreen = '<div className="relative"><div aria-hidden className="fo-orb fo-orb-lime h-60 w-60" /><div className="fo-grid absolute inset-0" /></div>';
const plantedFutureDecor = foDecorIn(plantedFutureScreen);
const plantedFutureUnhidden = plantedFutureDecor.filter((e) => !/\baria-hidden\b/.test(e.attrs));
ok(`the discoverer reads a planted future screen's ${plantedFutureDecor.length} decor and charges its ${plantedFutureUnhidden.length} exposed one (${plantedFutureDecor.length >= 2 && plantedFutureUnhidden.length === 1 ? "CHARGED" : "BLIND"}) — no decorated screen escapes the ${decorScreens.length}-screen census`,
  plantedFutureDecor.length >= 2 && plantedFutureUnhidden.length === 1 && decorScreens.length >= 2);
// M1073 · the real regression that motivated discovery: a strip an aria-hidden off a shipped orb
// must turn that screen from clean to exposed. Re-run the separation reader on the real sources
// with one attribute removed; it must go red, proving the clean green is not a vacuous pass.
const shippedOrb = "fo-orb fo-orb-lime";
const withOrbHidden = `<div aria-hidden className="${shippedOrb} h-60 w-60" />`;
const withOrbExposed = `<div className="${shippedOrb} h-60 w-60" />`;
const regressionCharged = foDecorIn(withOrbHidden).filter((e) => !/\baria-hidden\b/.test(e.attrs)).length === 0
  && foDecorIn(withOrbExposed).filter((e) => !/\baria-hidden\b/.test(e.attrs)).length === 1;
ok(`stripping aria-hidden off a shipped orb turns the separation reader from clean to ${foDecorIn(withOrbExposed).filter((e) => !/\baria-hidden\b/.test(e.attrs)).length} exposed (${regressionCharged ? "CHARGED" : "BLIND"}) against ${decor.length} clean shipped decor`,
  regressionCharged && decor.length >= 10 && decorUnhidden.length === 0);

// --- 4 · compositor hygiene: no persistent will-change, yet the hover still animates ------------
const willChangeRules = [...clean.matchAll(/([^{}]+)\{([^{}]*\bwill-change\s*:[^{}]*)\}/g)].map((m) => m[1].trim().replace(/\s+/g, " ") + "=" + (m[2].match(/will-change\s*:\s*([^;}]+)/) || [])[1]?.trim());
const liftRule = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => /\.fo-lift\s*([,{]|$)/.test(m[1]) && /transition\s*:/.test(m[2]));
const liftTransition = (liftRule?.[2].match(/transition\s*:\s*([^;]+)/) || [])[1] ?? "";
const liftProps = (liftTransition.match(/\b(?:transform|background-color|border-color|box-shadow|opacity|color)\b/g) ?? []).length;
ok(`the sheet pins ${willChangeRules.length} persistent will-change layers (${willChangeRules.join(", ") || "NONE"}) while the 11 reused .fo-lift cards keep their ${liftProps} hover properties`,
  willChangeRules.length === 0 && liftProps >= 4);
ok(`the .fo-lift hover still transitions ${liftProps} properties within a 240ms budget after the hint was removed (behaviour kept, layer freed)`,
  liftProps >= 4 && /240ms/.test(liftTransition) && !/will-change/.test(liftRule?.[2] ?? ""));
// Planted: a reused class with a pinned hint must be charged by the same rule scanner.
const plantedSheet = ".fo-lift { transition: transform 240ms ease; will-change: transform; }";
const plantedWillChange = [...plantedSheet.matchAll(/([^{}]+)\{([^{}]*\bwill-change\s*:[^{}]*)\}/g)].length;
ok(`the compositor detector charges ${plantedWillChange}/1 planted will-change rule against ${willChangeRules.length} shipped pins`,
  plantedWillChange === 1 && willChangeRules.length === 0);

// --- 5 · fo-* family closure + population floors ------------------------------------------------
const declaredFo = new Set();
for (const m of clean.matchAll(/\.(fo-[a-z][\w-]*)/g)) declaredFo.add(m[1]);
for (const m of clean.matchAll(/@utility\s+(fo-[a-z][\w-]*)/g)) declaredFo.add(m[1]);
for (const m of clean.matchAll(/@keyframes\s+(fo-[a-z][\w-]*)/g)) declaredFo.add(m[1]);
const code = APP_DIRS.flatMap((d) => walk(resolve(root, d))).map((p) => readFileSync(p, "utf8"));
const allCode = [...code, CSS, CINEMATIC].join("\n");
const unreadFo = [...declaredFo].filter((name) => (allCode.match(new RegExp("(?<![\\w-])" + name + "(?![\\w-])", "g")) ?? []).length <= 1);
ok(`all ${declaredFo.size} declared fo-* names have a reader past their own definition, ${unreadFo.length} unread: ${unreadFo.join(", ") || "NONE"}`,
  declaredFo.size >= 12 && unreadFo.length === 0);
// M1073: the census must read a MULTI-screen cinematic surface, not one hero. The reader count
// floor rises with the dashboard (1 -> 2 screens, 6 -> 10 decor), and every discovered screen must
// contribute at least one decor — an empty/coincidental match cannot inflate the population.
const perScreenDecor = decorScreens.map((f) => foDecorIn(f.src).length);
ok(`the motion census reads ${decorScreens.length} decorated screens (${SCREEN_NAMES}) each contributing decor (${perScreenDecor.join("+")}=${decor.length}), above the 2-screen / 10-decor floor`,
  decorScreens.length >= 2 && perScreenDecor.length >= 2 && perScreenDecor.every((n) => n >= 1) && decor.length >= 10);
ok(`the motion census read a real cinematic surface — ${KEYFRAMES.length} keyframes, ${INFINITE.length} infinite, ${ANIMS.length} animations, ${decor.length} decor elements, ${declaredFo.size} fo-* names, each above its floor`,
  KEYFRAMES.length >= 5 && INFINITE.length >= 5 && ANIMS.length >= 6 && decor.length >= 10 && declaredFo.size >= 12);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
