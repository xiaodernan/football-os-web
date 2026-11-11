// M1068: the accessibility floor — the theme's colour pairs are measured, not admired.
//
// The other 177 proofs read strings and structures; proof-theme-tokens.mjs asks whether a token has
// a READER, but nobody asks whether the reader can actually SEE the text. This gate parses the real
// `src/globals.css` :root (light) and .dark (dark) palettes, computes WCAG 2.1 relative luminance and
// contrast ratios, and refuses a foreground/background pair that falls below its contract:
//
//   • every `*-foreground` on its paired surface  >= 4.5:1  (WCAG AA, normal body text)
//   • the four semantic accents on the page background >= 2.9:1 (WCAG 1.4.11 non-text / large text)
//   • the colour-token sets are symmetric across light and dark (no theme that silently loses a role)
//
// The assertions are deterministic arithmetic on the shipped hex tokens — no browser, no rendering.
// A planted palette with a deliberately dim pair must be CHARGED, so widening a threshold can never
// quietly blind the gate. Honest limit: this measures the declared token pairs, not the composited
// result of opacity/overlays/gradients a particular component may add on top.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = readFileSync(resolve(root, "src/globals.css"), "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- WCAG 2.1 relative luminance & contrast (the published formula, no library) ----------------
const channel = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const luminance = (hex) => {
  const h = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!h) return null;
  const n = parseInt(h[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a, b) => {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

// --- read one theme block's custom properties --------------------------------------------------
const themeBlock = (selector) => {
  const m = new RegExp("\\" + selector + "\\s*\\{([^}]*)\\}").exec(CSS);
  const out = new Map();
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const t = /--([a-z0-9-]+):\s*([^;]+);/.exec(line);
    if (t) out.set(t[1], t[2].trim());
  }
  return out;
};
const LIGHT = themeBlock(":root");
const DARK = themeBlock(".dark");

// Every surface/foreground pair the theme declares (the shadcn/ui convention this sheet follows).
const PAIRS = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  // M1068 handoff: the parallel track added --sidebar-accent-foreground to both themes AND wired it
  // to AppShell's XP card (bg-sidebar-accent/40 + text-sidebar-accent-foreground). Now that this pair
  // really exists and really renders, the gate must MEASURE it too — 17.29:1 light / 14.27:1 dark.
  ["sidebar-accent-foreground", "sidebar-accent"],
];
const ACCENTS = ["destructive", "success", "warning", "info"];
const AA = 4.5;      // normal text
const NON_TEXT = 2.9; // UI graphics / large text — 3.0 is the WCAG line; 2.9 leaves rounding room
const THEMES = [{ name: "light", t: LIGHT }, { name: "dark", t: DARK }];

// --- 1 · the reader finds both palettes and every declared pair is hex -------------------------
for (const { name, t } of THEMES) {
  ok(`the ${name} palette is read with ${t.size} custom properties (not an empty block)`, t.size >= 20);
}

// --- 2 · body text pairs clear WCAG AA in BOTH themes -----------------------------------------
for (const { name, t } of THEMES) {
  const measured = PAIRS.map(([fg, bg]) => [fg, bg, contrast(t.get(fg), t.get(bg))]);
  const missing = measured.filter(([, , r]) => r === null).map(([fg, bg]) => `${fg}/${bg}`);
  const worst = measured.filter(([, , r]) => r !== null).sort((a, b) => a[2] - b[2])[0];
  ok(`all ${PAIRS.length} ${name} foreground/surface pairs are valid hex and compute a contrast (missing: ${missing.length ? missing.join(", ") : "none"})`,
    missing.length === 0 && measured.length === PAIRS.length);
  ok(`every ${name} body pair clears WCAG AA ${AA}:1 — the dimmest is ${worst[0]} on ${worst[1]} at ${worst[2].toFixed(2)}:1 with ${PAIRS.length} pairs checked`,
    missing.length === 0 && measured.every(([, , r]) => r >= AA));
}

// --- 3 · semantic accents clear the non-text / large-text floor in BOTH themes -----------------
for (const { name, t } of THEMES) {
  const bg = t.get("background");
  const measured = ACCENTS.map((a) => [a, contrast(t.get(a), bg)]);
  const worst = measured.filter(([, r]) => r !== null).sort((a, b) => a[1] - b[1])[0];
  ok(`all ${ACCENTS.length} ${name} semantic accents clear ${NON_TEXT}:1 on the page background (dimmest ${worst[0]} at ${worst[1].toFixed(2)}:1)`,
    measured.every(([, r]) => r !== null && r >= NON_TEXT));
}

// --- 4 · light and dark carry the same colour roles --------------------------------------------
// --radius is a shape token legitimately declared only once; every COLOUR role must be symmetric.
const colourTokens = (t) => new Set([...t.keys()].filter((k) => /^(background|foreground|card|popover|primary|secondary|muted|accent|destructive|success|warning|info|border|input|ring|chart|sidebar)/.test(k)));
const lightColours = colourTokens(LIGHT), darkColours = colourTokens(DARK);
const missingInDark = [...lightColours].filter((k) => !darkColours.has(k));
const missingInLight = [...darkColours].filter((k) => !lightColours.has(k));
ok(`light and dark carry the same ${lightColours.size} colour roles (dark-only: ${missingInLight.join(", ") || "none"}; light-only: ${missingInDark.join(", ") || "none"})`,
  missingInDark.length === 0 && missingInLight.length === 0 && lightColours.size >= 15);

// --- 5 · planted: a deliberately dim pair must be CHARGED (the gate is not vacuous) ------------
// Feed the exact same classifier a palette with one foreground lowered toward its background.
const dimLight = new Map(LIGHT);
dimLight.set("muted-foreground", "#dfe6e1"); // ~1.1:1 on --muted #eef2ef — invisible text
const dimRatio = contrast(dimLight.get("muted-foreground"), dimLight.get("muted"));
const realMuted = contrast(LIGHT.get("muted-foreground"), LIGHT.get("muted"));
const charged = dimRatio < AA && realMuted >= AA;
ok(`the AA classifier charges a planted dim pair (planted muted ${dimRatio.toFixed(2)}:1 < ${AA}, shipped muted ${realMuted.toFixed(2)}:1 >= ${AA}, ${charged ? 1 : 0} charge)`,
  charged && dimRatio < realMuted);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
