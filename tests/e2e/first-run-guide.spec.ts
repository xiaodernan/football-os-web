import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1230 The First-Run Guide: six coach-marks walk a brand-new visitor across the main board once.
// The guide opens by itself the first time the board is seen, advances step by step, can be
// skipped for good, and can be replayed from the settings row. This walks all four promises.
test("the quick tour opens for a new visitor, advances, and stays dismissed once skipped", async ({ page }) => {
  await completeOnboarding(page, "Tour Visitor");

  // It opens by itself: the welcome card, with the step counter.
  const dialog = page.getByRole("dialog", { name: "Welcome to Football OS" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Quick tour · step 1 of 6")).toBeVisible();

  // Next advances to the ranked-actions step, whose card names the panel it frames.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Your next moves, ranked" })).toBeVisible();
  await expect(page.getByText("Quick tour · step 2 of 6")).toBeVisible();

  // Back returns to the welcome; the walk is reversible.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Quick tour · step 1 of 6")).toBeVisible();

  // Skip dismisses for good — and a reload does not bring it back.
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Command Center").first()).toBeVisible();
});

test("the settings row replays the quick tour on demand", async ({ page }) => {
  await completeOnboarding(page, "Tour Visitor");
  await page.getByRole("button", { name: "Skip" }).click();
  await page.goto("/#/settings");

  await page.getByRole("button", { name: "Replay the quick tour" }).click();
  await expect(page.getByText("Replay the quick tour").last()).toBeVisible(); // the toast
  await page.goto("/#/");
  await expect(page.getByRole("dialog", { name: "Welcome to Football OS" })).toBeVisible();
});
