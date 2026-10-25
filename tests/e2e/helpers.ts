import { expect, type Page } from "@playwright/test";

// The onboarding walk every spec starts from: the visitor picks Player, names themself, picks
// striker and first-touch, skips the favourites and enters. Written once so a change to the
// flow is one edit, not four.
export async function completeOnboarding(page: Page, name = "Test Striker") {
  await page.goto("/#/onboarding");
  await page.getByRole("button", { name: /^Player/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.locator("input").first().fill(name);
  await page.getByRole("button", { name: /^ST/ }).click();
  await page.getByRole("button", { name: /Improve first touch/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Enter Football OS/ }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}
