import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test("dump the chair screen", async ({ page }) => {
  await completeOnboarding(page, "Chair Visitor");
  await page.goto("/#/chair");
  await page.waitForTimeout(800);
  const text = await page.locator("main").innerText();
  console.log("=== MAIN TEXT ===");
  console.log(text.slice(0, 1500));
  expect(true).toBe(true);
});
