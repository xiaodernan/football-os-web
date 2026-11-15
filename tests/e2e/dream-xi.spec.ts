import { expect, test } from "@playwright/test";

// M1147 · the Dream XI must be playable end-to-end: pick a formation, add players, watch the stats, save.
test("the dream XI screen builds a formation, picks players, and saves", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/dream-team", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the dream xi/i })).toBeVisible({ timeout: 20000 });
  // Stats render with a fresh zero XI
  await expect(page.getByText(/picks/i).first()).toBeVisible();
  // Click "auto-field the best"
  await page.getByRole("button", { name: /auto-field the best/i }).click();
  await page.waitForTimeout(150);
  // Stats must now show picks/11
  await expect(page.getByText(/11\/11/i).first()).toBeVisible({ timeout: 10000 });
  // Save
  await page.getByRole("button", { name: /save the xi/i }).click();
  // Reload — the stored XI must survive
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the dream xi/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/11\/11/i).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on the dream team: ${errors.join(" || ")}`).toHaveLength(0);
});
