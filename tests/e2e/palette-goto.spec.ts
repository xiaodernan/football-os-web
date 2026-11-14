import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1127 — The Command palette now knows the new cinematic routes: pressing the keyboard shortcut
// opens the palette and the new destinations are in the goto group with an empty query.
test("the palette lists the new cinematic destinations in its goto group", async ({ page }) => {
  await completeOnboarding(page, "PP Visitor");
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder(/Search players/).first();
  await expect(input).toBeVisible({ timeout: 5000 });
  const modal = page.locator("[role=dialog]");
  await expect(modal.getByText("Hall of Legends").first()).toBeVisible({ timeout: 5000 });
  await expect(modal.getByText("Chronicle").first()).toBeVisible();
  await expect(modal.getByText("Derby Codex").first()).toBeVisible();
  await expect(modal.getByText("Prophet").first()).toBeVisible();
  await expect(modal.getByText(/^upsets$|冷门之夜|冷門之夜/i).first()).toBeVisible({ timeout: 10000 });
  await expect(modal.getByText("The Chapter").first()).toBeVisible();
  await expect(modal.getByText("Moonshots").first()).toBeVisible();
  await expect(modal.getByText(/programme|节目册|節目冊/i).first()).toBeVisible();
  await expect(modal.getByText(/manual|使用手册|使用手冊/i).first()).toBeVisible();
  await page.keyboard.press("Escape");
});
