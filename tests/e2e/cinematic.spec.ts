import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// M1097 · The live-browser pass over the cinematic suite.
// Every screen that the project touches with its fo-orb/fo-grid glass treatment must survive a
// real navigation cycle and must mount its own glass hero in a real viewport without error. This
// spec is the *real-viewport* pass over the decorated catalogue: a visible headline, a healthy
// console, and a snapshot lane for the screenshots.

const SCREENSHOT_DIR = "tests/e2e/__shots__";
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const DECORATED = [
  // [route, heading matcher, expected detail]
  ["/ai", /live·gpt-6-sol/i, "/ai cinematic glass + LIVE chip"],
  ["/records", /the cabinet of records/i, "/records museum hero"],
  ["/season-room", /the season, commanded/i, "/season-room champion cards glass"],
  ["/world", /dynamic world cinema|dynamic world/i, "/world cinematic hero"],
  ["/league-rules", /the table, under different rules/i, "/league-rules cinematic hero"],
  ["/community", /the community hub|community cinema/i, "/community cinematic hero"],
  ["/manager", /manager|club-choice/i, "/manager club-choice cinematic hero"],
  ["/player", /\w+.*·\s*\w+/i, "/player mission cinematic hero"],
  ["/", /THE FOOTBALL OPERATING SYSTEM|Football OS/i, "/ landing root glass"],
  ["/onboarding", /what do you want/i, "/onboarding first-run glass"],
  ["/messaging", /the message pipeline/i, "/messaging cinematic hero"],
  ["/cache", /the cache tier|the cache/i, "/cache cinematic hero"],
  ["/platform", /the platform beneath the pitch/i, "/platform cinematic hero"],
  ["/legends", /the hall of legends/i, "/legends cinematic hero"],
  ["/chronicle", /the chronicle/i, "/chronicle cinematic hero"],
  ["/atlas", /the world atlas/i, "/atlas cinematic hero"],
  ["/derby-codex", /the derby codex/i, "/derby cinematic hero"],
  ["/prophet", /the prophet's slate/i, "/prophet cinematic hero"],
];

test.describe("the cinematic catalog mounts in a live viewport without console errors", () => {
  // M1108 (narrow, URL-scoped): two catalogs used to carry optional Spring live wires whose
  // upstream unavailability had to be logged on the browser console for the page to know it was
  // BOTH unconfigured-and-honest. M1114 extends this to /platform's spring fleet probe — three
  // catalogues, three scoped 503 exemptions, all tied to the exact same-origin path. The assertion
  // tolerates it with m.location()?.url.endsWith() as the gate — any other origin/path fails.
  const WIRE_503_ALLOWED: Record<string, string> = {
    "/cache": "/api/cache/service",
    "/messaging": "/api/messaging/service",
    "/platform": "/api/spring/fleet",
  };
  for (const [path, matcher, label] of DECORATED) {
    // test.step so Playwright UI groups the selector under one named block per screen.
    test(label, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const locationUrl = m.location()?.url ?? "";
        const wire = WIRE_503_ALLOWED[path];
        if (wire && m.text().includes("503") && locationUrl.endsWith(wire)) return;
        errors.push(m.text().slice(0, 200));
      });
      page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

      await page.goto(`/#${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);

      // The glass hero heading is always visible without a scroll.
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
      // The screenshot lane is for human review — not stored against the gate.
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${path.replace(/\//g, "_")}.png`, fullPage: true });

      expect(errors, `console errors on ${path}: ${errors.join(" || ")}`).toHaveLength(0);
    });
  }
});
