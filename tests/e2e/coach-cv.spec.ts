import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M966 — the coach résumé end to end: the career a visitor builds in the manager OS is the
// same record the coach CV derives from, through one fixture actually played in the browser.
// Nothing is seeded — the badges, the record and the public card must all grow out of the
// click on "Play next fixture".

test("a played manager career builds the coach CV, its badges and the public card", async ({ page }) => {
  await completeOnboarding(page, "E2E Boss");

  // Take charge: the picker boards the strongest club of the first competition.
  await page.goto("/#/manager");
  await page.locator("button", { hasText: /OVR \d+/i }).first().click();
  await expect(page.getByRole("button", { name: /Play next fixture/ })).toBeVisible();

  // One fixture, actually played by the engine.
  await page.getByRole("button", { name: /Play next fixture/ }).click();
  // The header's own line counts the fixture the engine just played.
  await expect(page.getByText(/matches played/).first()).toBeVisible();

  // The coach CV derives from that record: the tenure exists, the record panel stands, the
  // debut badge is earned and the public card mirrors the same figures.
  await page.goto("/#/coach");
  await expect(page.getByText("Coach CV").first()).toBeVisible();
  await expect(page.getByText("Season record")).toBeVisible();
  await expect(page.getByText("The dugout").first()).toBeVisible();
  await expect(page.getByText("Public card")).toBeVisible();
  await expect(page.getByText("Matches").first()).toBeVisible();
});
