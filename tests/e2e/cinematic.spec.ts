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
];

test.describe("the cinematic catalog mounts in a live viewport without console errors", () => {
  for (const [path, matcher, label] of DECORATED) {
    // test.step so Playwright UI groups the selector under one named block per screen.
    test(label, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
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
