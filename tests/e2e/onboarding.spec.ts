import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// The core path the plan names first: landing → onboarding → command centre.
test("a visitor enters from the landing page and lands in the command centre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Enter Football OS/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /Enter Football OS/i }).first().click();
  await expect(page.getByText("What are you?")).toBeVisible();
  await page.getByRole("button", { name: /^Manager/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator("input").first()).toBeVisible();
});

test("the onboarding walk completes and the profile follows the visitor into the app", async ({ page }) => {
  await completeOnboarding(page, "E2E Striker");
  await expect(page.getByText("Command Center").first()).toBeVisible();
  await expect(page.getByText("E2E Striker").first()).toBeVisible();
  await expect(page.getByText(/Level 1/).first()).toBeVisible();
});
