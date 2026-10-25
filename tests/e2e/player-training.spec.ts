import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test("the player OS opens on the overview and walks its tabs", async ({ page }) => {
  await completeOnboarding(page, "Player Visitor");
  await page.goto("/#/player");
  await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  await page.getByRole("button", { name: "Training" }).click();
  await expect(page).toHaveURL(/#\/player\/training/);
  await expect(page.getByText("Training").first()).toBeVisible();
});

// M453's screen: the course tree, the week's cycle and the potential radar.
test("the career tab shows the course tree and the week cycle", async ({ page }) => {
  await completeOnboarding(page, "Career Visitor");
  await page.goto("/#/player/career");
  await expect(page.getByText("Training courses")).toBeVisible();
  await expect(page.getByText("First Touch Basics", { exact: true })).toBeVisible();
  await expect(page.getByText("Fitness", { exact: true })).toBeVisible();
  await expect(page.getByText("Potential", { exact: true })).toBeVisible();
});
