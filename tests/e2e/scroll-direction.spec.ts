import { expect, test } from "@playwright/test";

// M1227 · The wheel-direction regression gate. The app ships NO custom wheel/scroll handler
// (there is no deltaY/onWheel code in the tree), so the browser's native direction is the contract:
// a downward wheel must increase scrollY (move toward later content) and an upward wheel must
// decrease it. This test fails if anyone later adds an inverted handler to a shell or panel.
test("native wheel direction is preserved: down moves toward later content", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });

  const maxScroll = await page.evaluate(() =>
    document.documentElement.scrollHeight - window.innerHeight);
  expect(maxScroll, "the landing page must be tall enough to measure scroll direction").toBeGreaterThan(300);

  await page.evaluate(() => window.scrollTo(0, 0));
  const start = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(start + 100);
  const afterDown = await page.evaluate(() => window.scrollY);

  await page.mouse.wheel(0, -500);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeLessThan(afterDown - 100);
});
