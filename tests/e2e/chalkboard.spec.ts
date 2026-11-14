import { expect, test } from "@playwright/test";

// M1138 · the duel must be playable, honestly graded and stable: pick one of the three
// doors per fixture; the mask falls; the verdict lands; the record persists on this device.
test("the chalkboard run plays to a verdict and survives a reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("503")) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/chalkboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the chalkboard cup/i })).toBeVisible({ timeout: 20000 });
  // Every question carries three answer buttons showing "??" before any pick.
  const masked = page.locator("button", { hasText: "??" });
  await expect(masked.first()).toBeVisible({ timeout: 10000 });
  const before = await masked.count();
  expect(before, "five games of three options each").toBeGreaterThanOrEqual(15);

  // Answer one button per fixture (the first home-side button in each fixture row).
  const fixtures = page.locator("ol > li");
  await expect(fixtures).toHaveCount(5, { timeout: 10000 });
  for (let round = 0; round < 5; round++) {
    const firstMasked = fixtures.nth(round).locator("button", { hasText: "??" }).first();
    await expect(firstMasked).toBeVisible({ timeout: 15000 });
    await firstMasked.click();
    await page.waitForTimeout(150);
  }

  // The verdict lands with a number and a rank line.
  await expect(page.getByRole("button", { name: /play another run/i })).toBeVisible({ timeout: 10000 });
  const maskedAfter = await page.locator("button", { hasText: "??" }).count();
  expect(maskedAfter, "no masked answer left after the verdict").toBe(0);

  // Reload: the record must survive (one run played, stored on this device).
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the chalkboard cup/i })).toBeVisible({ timeout: 20000 });
  const record = await page.locator("text=/1 runs played/").first();
  await expect(record).toBeVisible({ timeout: 10000 });

  expect(errors, `console errors on the chalkboard: ${errors.join(" || ")}`).toHaveLength(0);
});
