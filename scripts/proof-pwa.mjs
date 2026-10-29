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
// and recorded in tests/perf/baseline.json in the same commit).
const BUDGET_KB = 526;
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
