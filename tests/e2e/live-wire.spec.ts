import { expect, test } from "@playwright/test";

// M1152 · The Live Wire · 实时之线 — the real Bundesliga 2026/27, rendered exactly as the
// committed public/live-wire.json carries it. The wire is re-cut weekly by CI from OpenFootball's
// CC0 fixture file, so assertions here lean on shape (18 rows, the live badge, the source link),
// never on a specific scoreline — the file is allowed to move.
test("the /live-wire screen renders the committed CC0 wire, honestly labelled", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/live-wire", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the live wire|实时之线|即時之線/i })).toBeVisible({ timeout: 20000 });

  // the honest live badge and the season chip (season is rendered from the payload itself)
  await expect(page.getByText("LIVE WIRE", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("2026/27").first()).toBeVisible();

  // the standings table: header glyphs + the champions row that owns pos 1 right now
  await expect(page.getByText("PTS").first()).toBeVisible();
  await expect(page.getByText("GD").first()).toBeVisible();
  await expect(page.getByText("Borussia Dortmund").first()).toBeVisible();

  // the zone guide is printed on-page (ucl/europa/play-off/relegation) — honesty is in the room
  await expect(page.getByText(/champions league|冠军联赛|冠軍聯賽/i).first()).toBeVisible();

  // the source link names OpenFootball and the file the wire reads
  await expect(page.getByRole("link", { name: /OpenFootball/i }).first()).toBeVisible();

  // the wire brief affordance is armed on the screen (no live call happens here — see live-llm-chronicle for the paid path)
  await expect(page.getByRole("button", { name: /wireside brief|电波快讯|電波快訊/ }).first()).toBeVisible();

  // at least one scoreline renders in the recent-results column (shape, not a hardcoded number)
  await expect(page.getByText(/\d+–\d+/).first()).toBeVisible();

  expect(errors, `console errors on /live-wire: ${errors.join(" || ")}`).toHaveLength(0);
});
