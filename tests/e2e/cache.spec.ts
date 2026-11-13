import { expect, test } from "@playwright/test";

// M1098 · the cache observatory's live-wire panel. Mounted on dev only. A fresh session of the dev
// server has seen no LLM calls, so the probe reports zeros and the screen prints the honest "no
// stores yet" word; if a prior test has warmed the lane, the panel switches to the sentence instead.
// The UI carries both halves of a degraded/if-live answer honestly — Playwright sees either.

test("the cache live-wire panel mounts and renders honest copy", async ({ page }) => {
  await page.goto("/#/cache");
  await page.waitForTimeout(2000);
  // A real h2 title from cache.title must be present.
  await expect(page.getByRole("heading", { name: /the cache tier/i })).toBeVisible();
  // The analysis folds rendered (Bloom admission, single-flight).
  await expect(page.getByRole("heading", { name: /Bloom admission/i })).toBeVisible();
  // The live-wire panel renders — either the empty word or the counters sentence.
  const body = page.locator("body");
  const emptyShot = await body.getByText(/no stores yet/i).count();
  const wireShot = await body.getByText(/memory hits|liveWire|Live right now/i).count();
  expect(emptyShot + wireShot).toBeGreaterThan(0);
});
