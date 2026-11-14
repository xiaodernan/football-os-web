import { test, expect } from "@playwright/test";

// M1124 — The Upsets walk: the cinematic hero, the ranked scandals read from the frozen seed,
// zero console errors.
test("The Upsets renders the nights the model misread, in shock order", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/upsets", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Upsets" })).toBeVisible({ timeout: 20000 });
  const list = page.locator("ol > li");
  await expect(list.first()).toBeVisible({ timeout: 15000 });
  const count = await list.count();
  expect(count, "the anthology prints at least one scandalous night").toBeGreaterThan(0);
  await expect(page.getByText("shock multiplier").first()).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /upsets: ${errors.join(" || ")}`).toHaveLength(0);
});
