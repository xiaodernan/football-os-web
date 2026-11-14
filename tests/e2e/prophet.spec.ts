import { test, expect } from "@playwright/test";

// M1122 — The Prophet's Slate walk: the cinematic hero, fixture cards from the frozen seed, the
// win/draw/win band and zero console errors. Nothing on this page promises truth — the fold only
// prints probabilities computed from the seed itself.
test("The Prophet's Slate renders fixture cards with the model's own odds", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/prophet", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Prophet's Slate" })).toBeVisible({ timeout: 20000 });
  const list = page.locator("ol > li");
  await expect(list.first()).toBeVisible({ timeout: 15000 });
  const count = await list.count();
  expect(count, "the slate prints at least one fixture card").toBeGreaterThan(0);
  await expect(page.getByText("most likely").first()).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /prophet: ${errors.join(" || ")}`).toHaveLength(0);
});
