import { test, expect } from "@playwright/test";

// M1120 — The World Atlas walk: the cinematic hero h1, the convoy bar and the two humans tiles
// must render from the frozen seed with zero console errors.
test("The World Atlas renders its population tiles, the convoy bar and the two humans", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/atlas", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The World Atlas" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("players", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("The convoy", { exact: true })).toBeVisible();
  await expect(page.getByText("The world's best", { exact: true })).toBeVisible();
  await expect(page.getByText("The striker-king", { exact: true })).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /atlas: ${errors.join(" || ")}`).toHaveLength(0);
});
