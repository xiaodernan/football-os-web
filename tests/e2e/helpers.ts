import { expect, type Page } from "@playwright/test";

// M1230/M1233: a fresh device's first landing opens the first-run guide, whose card can sit over
// the board and intercept a click on the control underneath it. Specs that click main content
// dismiss it first — the tour is a known first-run overlay, not a defect to route around.
export async function dismissTour(page: Page) {
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.count() > 0) await skip.click();
  await expect(page.getByRole("dialog", { name: "Welcome to Football OS" })).toHaveCount(0);
}

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
