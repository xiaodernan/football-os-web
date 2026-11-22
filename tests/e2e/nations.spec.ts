import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1237 — the talent map: the world by nation. The tiles carry the world's real geography, the
// board ranks strongest-first, and the method line is honest about what a nation's numbers are.
test("the talent map ranks the world's nations", async ({ page }) => {
  await completeOnboarding(page, "Nations Visitor");
  await page.goto("/#/nations");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Talent Map" })).toBeVisible();
  await expect(page.getByText(/Where the world's talent comes from/)).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  await expect(page.getByText("Strongest nation").first()).toBeVisible();
  await expect(page.getByText(/players · best .+ · avg [\d.]+/).first()).toBeVisible();
  await expect(page.getByText(/A nation's best is its highest overall/)).toBeVisible();
});
