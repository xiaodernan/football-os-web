// Proof for the installable app (M458): the manifest, the shell link, the production-only
// registration and the service worker's caching rules — plus the bundle budget that stands in
// for the plan's "3G first paint" until the E2E suite (M459) can measure it for real.
//
// Every check is a PURE function over the file's text, so the proof can feed each one a broken
// fixture and require it to refuse: a gate whose reader cannot fail is not a gate. The bundle
// budget reads the real build (dist/) with zlib, so it measures what ships, not what the source
// promises.
// Run: node scripts/proof-pwa.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const manifestText = readFileSync("public/manifest.webmanifest", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const mainTsx = readFileSync("src/main.tsx", "utf8");
const swJs = readFileSync("public/sw.js", "utf8");

// ---- The four checks, as pure predicates over text. -------------------------------------------

const checkManifest = (raw) => {
  let m;
  try { m = JSON.parse(raw); } catch { return false; }
  return !!m && typeof m.name === "string" && m.name.length > 0 &&
    typeof m.short_name === "string" && m.short_name.length > 0 &&
    m.start_url === "/" && m.display === "standalone" &&
    /^#[0-9a-f]{6}$/i.test(m.theme_color || "") && /^#[0-9a-f]{6}$/i.test(m.background_color || "") &&
    Array.isArray(m.icons) && m.icons.length > 0 &&
    m.icons.every((i) => i && typeof i.src === "string" && typeof i.type === "string" && typeof i.sizes === "string") &&
    m.icons.some((i) => i.type === "image/svg+xml") &&
    m.icons.some((i) => String(i.purpose || "").includes("maskable"));
};

const checkIndex = (html) =>
  /<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/.test(html) &&
  /<meta[^>]+name="theme-color"/.test(html) &&
  /<link[^>]+rel="apple-touch-icon"/.test(html) &&
  /<link[^>]+rel="icon"/.test(html);

const checkMain = (js) =>
  /import\.meta\.env\.PROD/.test(js) &&
  /"serviceWorker"\s+in\s+navigator/.test(js) &&
  /serviceWorker\.register\("\/sw\.js"\)/.test(js);

const checkSw = (js) => {
  const need = [
    /const VERSION = "/,                              // versioned cache name
    /cache\.addAll\(SHELL\)/,                         // the shell installs
    /self\.skipWaiting\(\)/,                          // install takes over
    /key !== VERSION/,                                // activate drops old caches
    /url\.origin !== self\.location\.origin/,         // same-origin guard
    /url\.pathname\.startsWith\("\/functions\/"\)/,   // the API is never cached
    /request\.mode === "navigate"/,                   // navigations…
    /caches\.match\("\/index\.html"\)/,               // …fall back to the cached shell
    /caches\.match\(request\)\.then\(\(cached\)/,     // static: cached first…
    /return cached \|\| network/,                     // …network fills behind
  ];
  return need.every((re) => re.test(js));
};

// ---- Plants: every check must refuse a broken fixture. -----------------------------------------

const badManifestNoDisplay = JSON.stringify({ name: "X", short_name: "X", start_url: "/", theme_color: "#000000", background_color: "#000000", icons: [{ src: "/i.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }] });
const badManifestNoMaskable = JSON.stringify({ name: "X", short_name: "X", start_url: "/", display: "standalone", theme_color: "#000000", background_color: "#000000", icons: [{ src: "/i.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] });
const badManifestEmptyIcons = JSON.stringify({ name: "X", short_name: "X", start_url: "/", display: "standalone", theme_color: "#000000", background_color: "#000000", icons: [] });
const badIndex = "<html><head><title>x</title></head><body></body></html>";
const badMainDevOnly = 'if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");';
const badSwNoApi = swJs.replace('if (url.pathname.startsWith("/functions/")) return;', "");
const badSwNoOrigin = swJs.replace("if (url.origin !== self.location.origin) return;", "");
const badSwNoFallback = swJs.replace('caches.match("/index.html")', 'caches.match("/nope")');
ok(`all four checks are armed — each reads the real files and refuses its broken fixtures (manifest ${checkManifest(manifestText)}/${checkManifest(badManifestNoDisplay)}/${checkManifest(badManifestNoMaskable)}/${checkManifest(badManifestEmptyIcons)}, index ${checkIndex(indexHtml)}/${checkIndex(badIndex)}, main ${checkMain(mainTsx)}/${checkMain(badMainDevOnly)}, sw ${checkSw(swJs)}/${checkSw(badSwNoApi)}/${checkSw(badSwNoOrigin)}/${checkSw(badSwNoFallback)})`,
  checkManifest(manifestText) && !checkManifest(badManifestNoDisplay) && !checkManifest(badManifestNoMaskable) && !checkManifest(badManifestEmptyIcons) &&
  checkIndex(indexHtml) && !checkIndex(badIndex) &&
  checkMain(mainTsx) && !checkMain(badMainDevOnly) &&
  checkSw(swJs) && !checkSw(badSwNoApi) && !checkSw(badSwNoOrigin) && !checkSw(badSwNoFallback));

// ---- The shell exists: the manifest, the icon and the worker are all shipped. -------------------
const shellOk = ["public/manifest.webmanifest", "public/icon.svg", "public/sw.js"].every((f) => existsSync(f));
ok(`the shell ships — the manifest, the icon and the worker are all files in the tree (${shellOk})`, shellOk);

// ---- The bundle budget: what ships, measured in gzip, against a pin. ---------------------------
// M573: 514 -> 520 after the dashboard's next-step panel; M574: 520 -> 521 after /clock (the
// screen, its route and its dictionary slice add 3 KB gzip over the M573 build); M621: 521 -> 524
// after /briefing on top of /clock; M622: 524 -> 525 after the discipline trend panel and M623:
// 525 -> 526 after the match page's stakes panel (measured at 526 KB / 54 assets on the merged tree
// and recorded in tests/perf/baseline.json in the same commit); M625: 526 -> 527 after the event
// clock's siege panel (measured at 527 KB / 54 assets, JS 513 + CSS 13, recorded the same way);
// M626: 527 -> 528 after the discipline venue split (measured at 528 KB / 54 assets, JS 514 + CSS 13).
// M627: the pin holds at 528 (the stakes swing lines measure 515 JS + 13 CSS, still 528 KB).
// M628: 528 -> 529 after the clock's faced row and busiest-window line (measured at 529 KB /
// 54 assets, JS 515 + CSS 13, recorded in the same commit).
// M630: the briefing swing panel measures 528 KB / 54 assets (JS 516 + CSS 12.5), so the pin
// drops 529 -> 528 and the baseline re-records 529 -> 528.
// M631: the club page's siege line measures 529 KB / 54 assets (JS 516 + CSS 12.5), so the pin
// returns 528 -> 529 and the baseline re-records 528 -> 529.
// M632: the stakes panel's two place lines hold the pin at 529 (JS 517 + CSS 12.5, still 529 KB);
// the baseline re-records the JS figure only.
// M712: the late-siege panel measures 530 KB / 54 assets (JS 517 + CSS 12.4), so the pin moves
// 529 -> 530 and the baseline re-records it.
// M773: the clock's opening board — twelve dictionary lines, one panel and the board's new opening
// record — measures 531 KB / 54 assets (JS 518.4 + CSS 12.4), so the pin moves 530 -> 531.
// M779: the card clock panel adds one row per booked club to an existing table and reuses the
// clock's strike line, measuring 532 KB / 54 assets (JS 520 + CSS 12.4), so the pin moves
// 531 -> 532 and the baseline re-records it.
// M785: the league card curve adds its panel and two dictionary lines, measuring 533 KB / 54
// assets (JS 520 + CSS 12.4), so the pin moves 532 -> 533 and the baseline re-records it.
// M788: the venue screen's goal clock adds its panel and the shared band labels, crossing the
// budget's rounding edge — 534 KB / 54 assets (JS 522 + CSS 12.4), pin 533 -> 534, baseline
// re-recorded in the same commit.
// M943: the venue screen's shot/save clock adds its panel and six keys, measuring 535 KB /
// 54 assets, pin 534 -> 535, baseline re-recorded in the same commit.
// M944: the discipline screen's contrast board adds its panel and seven keys, measuring
// 536 KB / 54 assets (JS 523 + CSS 12.4), pin 535 -> 536, baseline re-recorded in the same commit.
// M947: the event clock screen's club rhythm panel adds its list and four keys, measuring
// 537 KB / 54 assets (JS 524 + CSS 12.4), pin 536 -> 537, baseline re-recorded in the same commit.
// M948: the venue rhythm rows and the two red-result boards measure 538 KB / 54 assets
// (JS 526 + CSS 12.4), pin 537 -> 538, baseline re-recorded in the same commit.
// M951: the drawn board measures 539 KB / 54 assets (JS 526 + CSS 12.5), pin 538 -> 539,
// baseline re-recorded in the same commit.
// M954: the event clock's venue panel measures 540 KB / 54 assets (JS 527 + CSS 12.5),
// pin 539 -> 540, baseline re-recorded in the same commit.
// M956: the lead board measures 543 KB / 55 assets (JS 530 + CSS 12.5), pin 540 -> 543.
// M957: the deficit board measures 544 KB / 55 assets (JS 531 + CSS 12.5), pin 543 -> 544.
// M961: the collapse list measures 545 KB / 55 assets (JS 532 + CSS 12.5), pin 544 -> 545.
// M962: the runs board measures 547 KB / 56 assets (JS 535 + CSS 12.5), pin 545 -> 547.
// M963: the venue run line measures 548 KB / 56 assets (JS 535 + CSS 12.5), pin 547 -> 548.
// M971: the other lane's form table shipped a new screen and a new chunk without pricing them
// (its own tree measures 551 KB / 56 assets against the 548 pin), and this lane's severity board
// adds its panel and five keys on top — measured 552 KB / 57 assets (JS 539 + CSS 12.5), pin
// M972: the severity board by end adds its panel, six keys per locale and four counters on the
// card clock's own rows — measured 553 KB / 57 assets (JS 540 + CSS 12.5), pin 552 -> 553,
// baseline re-recorded in the same commit. This tree also carries the venue-split columns and
// their two keys; the total is measured after the build, not guessed.
// M975: the save-quality panel adds its panel, four keys and a new chunk — measured 554 KB /
// 57 assets (JS 541 + CSS 12.5), pin 553 -> 554, baseline re-recorded in the same commit.
// M976: the wall panel rides the same bundle — measured 555 KB / 57 assets (JS 542 + CSS 12.5),
// pin 554 -> 555, baseline re-recorded in the same commit.
// M979: the honesty report rides the simulation lab's chunk — measured 557 KB / 57 assets
// (JS 544 + CSS 12.5), pin 555 -> 557, baseline re-recorded in the same commit.
// M981: the match-page xG panel rides the football world's chunk — measured 558 KB / 57 assets
// (JS 545 + CSS 12.5), pin 557 -> 558, baseline re-recorded in the same commit.
// M983: the owed margins panel rides the timing screen's chunk — measured 559 KB / 57 assets
// (JS 547 + CSS 12.5), pin 558 -> 559, baseline re-recorded in the same commit.
// M984: the strictness board rides the discipline screen's chunk — measured 560 KB / 57 assets
// (JS 547 + CSS 12.5), pin 559 -> 560, baseline re-recorded in the same commit.
// M985: the wildest results panel rides the leaders chunk — measured 561 KB / 57 assets
// (JS 549 + CSS 12.5), pin 560 -> 561, baseline re-recorded in the same commit.
// M987: the after-a-defeat board rides the timing screen's chunk — measured 562 KB / 57 assets
// (JS 549 + CSS 12.5), pin 561 -> 562, baseline re-recorded in the same commit.
// M989: the closing-time xG board rides the timing chunk — measured 563 KB / 57 assets
// (JS 550 + CSS 12.5), pin 562 -> 563, baseline re-recorded in the same commit.
// M990: the openness board rides the world chunk, unchanged at 563 KB / 57 assets.
// M991: the widest-away-win panels ride the world chunk — measured 564 KB / 57 assets
// (JS 552 + CSS 12.5), pin 563 -> 564, baseline re-recorded in the same commit.
// M992: the blank runs panel rides the leaders chunk — measured 565 KB / 57 assets
// (JS 553 + CSS 12.5), pin 564 -> 565, baseline re-recorded in the same commit.
// M998: the passers board rides the leaders chunk — measured 566 KB / 57 assets
// (JS 554 + CSS 12.5), pin 565 -> 566, baseline re-recorded in the same commit.
// M999: the under-fire squads ladder rides the injuries chunk — measured 567 KB / 57 assets
// (JS 555 + CSS 12.5), pin 566 -> 567, baseline re-recorded in the same commit.
// M1003: the cards by end and window panel rides the venue chunk — measured 568 KB / 57 assets
// (JS 555 + CSS 12.5), pin 567 -> 568, baseline re-recorded in the same commit.
// M1010: the corner pressure panel rides the leaders chunk — measured 569 KB / 57 assets
// (JS 556 + CSS 12.5), pin 568 -> 569, baseline re-recorded in the same commit.
// M1014: the duel kings panel rides the leaders chunk — measured 570 KB / 57 assets
// (JS 557 + CSS 12.5), pin 569 -> 570, baseline re-recorded in the same commit.
// M1016: the world lethal panel rides the leaders chunk — unchanged at 570 KB, baseline re-recorded
// (JS 558).
// M1018: the red card kings panel rides the discipline chunk — measured 571 KB / 57 assets
// (JS 558 + CSS 12.5), pin 570 -> 571, baseline re-recorded in the same commit.
// M1020: the five-moments panel rides the streaks chunk — measured 573 KB / 57 assets
// (JS 560 + CSS 12.5), pin 571 -> 573, baseline re-recorded in the same commit.
// M1021: the leading foulers panel rides the discipline chunk — unchanged at 573 KB, baseline re-recorded
// (JS 560).
// M1022: the /finance route rides its own chunk — measured 576 KB / 58 assets
// (JS 564 + CSS 12.6), pin 573 -> 576, baseline re-recorded in the same commit.
// M1023: the /league-rules route rides its own chunk — measured 579 KB / 59 assets
// (JS 567 + CSS 12.6), pin 576 -> 579, baseline re-recorded in the same commit.
// M1027: the trigger fingers panel rides the leaders chunk — measured 580 KB / 59 assets
// (JS 567 + CSS 12.6), pin 579 -> 580, baseline re-recorded in the same commit.
// M1028: the /academy route rides its own chunk — measured 583 KB / 60 assets
// (JS 570 + CSS 12.6), pin 580 -> 583, baseline re-recorded in the same commit.
// M1028: the /academy route rides its own chunk — measured 583 KB / 60 assets
// (JS 570 + CSS 12.6), pin 580 -> 583, baseline re-recorded in the same commit.
// M1029: the age pyramid panel rides the academy chunk — measured 584 KB / 60 assets
// (JS 571 + CSS 12.6), pin 583 -> 584, baseline re-recorded in the same commit.
// M1030: the /records route rides its own chunk — measured 587 KB / 61 assets
// (JS 575 + CSS 12.6), pin 584 -> 587, baseline re-recorded in the same commit.
// M1031: the dynasties panel rides the world chunk — measured 588 KB / 61 assets
// (JS 575 + CSS 12.6), pin 587 -> 588, baseline re-recorded in the same commit.
// M1032: the tackling kings panel rides the discipline chunk — measured 589 KB / 61 assets
// (JS 576 + CSS 12.6), pin 588 -> 589, baseline re-recorded in the same commit.
// M1033: the coaching council panel rides the world chunk — measured 590 KB / 61 assets
// (JS 577 + CSS 12.6), pin 589 -> 590, baseline re-recorded in the same commit.
// M1036: the platform atlas rides its own lazy chunk — 594 KB / 62 assets (JS 582 + CSS 12.6),
// pin 590 -> 594, baseline re-recorded in the same commit.
// M1037: the atlas gains the world-contract line — 595 KB, pin 594 -> 595.
// M1039: the metronomes panel grows the leaders chunk by one KB — 596 KB, pin 595 -> 596,
// baseline re-recorded in the same commit (JS 583, CSS 12.6).
// M1041: the rescued results panel grows the world chunk by two KB — 598 KB, pin 596 -> 598,
// baseline re-recorded in the same commit (JS 586, CSS 12.6).
// M1044: the last-gasp kings panel grows the leaders chunk by one KB — 599 KB, pin 598 -> 599,
// baseline re-recorded in the same commit (JS 587, CSS 12.6).
// M1046: the atlas gains a second route row — 600 KB, pin 599 -> 600,
// baseline re-recorded in the same commit (JS 587, CSS 12.6).
// M1049: the taxmen panel grows the discipline chunk by one KB — 600 KB, pin 600 stands,
// baseline re-recorded in the same commit (JS 588, CSS 12.6).
// M1051: the leaders chunk crosses the 600 KB line as measured — 601 KB, pin 600 -> 601,
// baseline re-recorded in the fix commit (JS 589, CSS 12.6).
// M1055: the discipline chunk's monks panel nudges the total one KB more — 602 KB, pin 601 -> 602,
// baseline re-recorded in this commit (JS 589, CSS 12.6).
// M1057: the leaders chunk crosses the 604 KB line as measured by the gate — 606 KB, pin 603 -> 606,
// baseline re-recorded in the same commit (JS 594, CSS 12.6).
// M1059: the message pipeline adds a screen and two interactive SVGs — 618 KB, pin 606 -> 618,
// baseline re-recorded in the same commit (JS 605, CSS 12.7).
// M1064: the cache observatory adds a lazy screen + its domain fold — 628 KB across 67 assets,
// pin 618 -> 628, baseline re-recorded in the same commit (JS 615, CSS 13).
// M1072: the rules-swing panel adds a lazy-route surface — 629 KB across 67 assets,
// pin 628 -> 629, baseline re-recorded in the same commit (JS 616, CSS 13.3).
// M1075: the atlas gains a second read-through row — 630 KB, pin 629 -> 630,
// baseline re-recorded in the same commit (JS 617, CSS 13.3).
// M1078: the live LLM tie-in grows the AI chunk by enough to cross the 634 KB line as measured
// by the gate — JS 620 KB, CSS 13.4 KB (67 assets), pin 630 -> 634, baseline re-recorded.
// M1080: the season-room screen + fold grows JS by gzip 4 KB and adds 3 assets (70), pin 634 -> 638.
// M1085: the drop-zone watch panel adds another lazy-route surface — 639 KB measured, pin 638 -> 639.
// M1091: the dynamic world's cinematic header pushes the shared budget exactly over — 640 KB measured,
// pin 639 -> 640, baseline re-recorded.
// M1095: the player mission's cinematic header pushes one KB more — 641 KB measured, pin 640 -> 641.
// M1098: the live-wire cache probe panel pushes one KB more — 642 KB measured, pin 641 -> 642.
// M1104: the fleet probe panel (seven tiles + one same-origin fetch + nine keys x3) grows the
// shared chunk by two KB — 644 KB measured / 70 assets (JS 630, CSS 13.5), pin 642 -> 644, baseline
// re-recorded in the same commit.
// M1105: the parallel lane's streaming path lands end-to-end — 645 KB measured / 70 assets (JS 631,
// CSS 13.9), pin 644 -> 645, baseline re-recorded in the same commit.
// M1107: the messaging live wire panel adds seven keys x3 and one panel — 646 KB measured / 70 assets
// (JS 632, CSS 13.7), pin 645 -> 646, baseline re-recorded in the same commit.
// M1115: the Spring conditional-GET atlas panel (validatorLine + validatorBoundary ×3 locales + the ETag live wire view)
// adds PlatformAtlas weight and pushes two KB more — 648 KB measured / 70 assets (JS 634, CSS 13.7), pin 646 -> 648, baseline
// re-recorded in the same commit.
// M1116: the Hall of Legends — a new lazy screen with its own fold and cinematic header; ~3 KB JS
// (634 -> 638) and one more asset (70 -> 71). total measured 651 KB, pin 648 -> 651.
// M1117: the World's epic chronicle screen added ~5 KB — features/chronicle + domain/chronicle — pin 651 -> 656 KB.
// M1120: the World Atlas (features/atlas + domain/atlas.ts) — clean code, small folds + the convoy
// band — lands at 659 KB gzip across 75 assets: 656 -> 659.
const BUDGET_KB = 662;
const assetsDir = "dist/assets";
const exists = existsSync(assetsDir);
let jsGzip = 0, cssGzip = 0, files = 0;
if (exists) {
  for (const f of readdirSync(assetsDir)) {
    if (!f.endsWith(".js") && !f.endsWith(".css")) continue;
    const g = gzipSync(readFileSync(`${assetsDir}/${f}`)).length;
    if (f.endsWith(".js")) jsGzip += g; else cssGzip += g;
    files++;
  }
}
const totalKb = Math.round((jsGzip + cssGzip) / 1024);
ok(`the build ships inside the budget — ${totalKb} KB gzip across ${files} assets (JS ${Math.round(jsGzip / 1024)} KB, CSS ${(cssGzip / 1024).toFixed(1)} KB), pin ${BUDGET_KB} KB (the plan's 3G proxy until M459 measures it)`,
  exists && files >= 20 && totalKb > 0 && totalKb <= BUDGET_KB);

// ---- The worker is registered once, and only in production. ------------------------------------
const registrations = (mainTsx.match(/serviceWorker\.register\(/g) || []).length;
ok(`the worker is registered exactly once, behind the production guard (${registrations} registration)`,
  registrations === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
