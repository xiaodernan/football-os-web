import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1234 — the cliff: the squad depth board. The tiles carry the world's real extremes, the board
// ranks steepest-first, and the method line is honest about what a cliff is.
test("the cliff ranks the world's squad depth", async ({ page }) => {
  await completeOnboarding(page, "Depth Visitor");
  await page.goto("/#/depth");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Cliff" })).toBeVisible();
  await expect(page.getByText(/The drop from a club's best player to its eleventh/)).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  await expect(page.getByText("Steepest cliff").first()).toBeVisible();
  await expect(page.getByText(/in the squad · best \d+ · XI avg [\d.]+ · bench avg [\d.]+/).first()).toBeVisible();
  await expect(page.getByText(/The cliff is the overall distance from a club's best player to its eleventh/)).toBeVisible();
});
