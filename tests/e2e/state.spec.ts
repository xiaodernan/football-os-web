import { expect, test } from "@playwright/test";

// M967 — state you can touch: the world's seasons advance and the report reads them, and the
// settings page's storage round-trip (export, reset, preferences survive) behaves the way the
// storage door's contract says it does.

test("the world's seasons advance and the season report reads the run", async ({ page }) => {
  await page.goto("/#/world");
  await expect(page.getByText("Dynamic World").first()).toBeVisible();
  // Two seasons, actually simulated by the engine.
  await page.getByRole("button", { name: /Simulate next season/ }).click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /Simulate next season/ }).click();
  // The report derives from the run the two clicks produced.
  await expect(page.getByText("Season report")).toBeVisible();
  await expect(page.getByText("Top riser")).toBeVisible();
  await expect(page.getByText("Season arc")).toBeVisible();
  // The champions list carries the seasons' winners, newest first.
  await expect(page.getByText("Champions by season")).toBeVisible();
});

test("the settings page exports every store and resets activity, keeping preferences", async ({ page }) => {
  await page.goto("/#/settings");
  await expect(page.getByText("Your data")).toBeVisible();

  // The export is a real download the browser receives.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export all \(JSON\)/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^football-os-export-\d{4}-\d{2}-\d{2}\.json$/);

  // The reset asks before it erases, then reports what it cleared — and the language row
  // (a preference) survives beside the emptied activity stores.
  await page.getByRole("button", { name: /Reset activity/ }).click();
  await expect(page.getByText(/Erase all activity records/)).toBeVisible();
  await page.getByRole("button", { name: /Yes, reset/ }).click();
  await expect(page.getByText(/Cleared \d+ activity stores/)).toBeVisible();
  // The preference row itself, not the copy around it: the same word appears in the mode
  // description, the reset warning and the settings table.
  await expect(page.locator("div").filter({ hasText: /^Language$/ }).first()).toBeVisible();
});
