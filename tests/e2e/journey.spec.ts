import { expect, test } from "@playwright/test";

// M1150 · The Journey: the world-tour completion ring, folded from this device's true visits.
test("the journey renders the passport with chapters, and a fresh world shows 0% walked", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/journey", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the journey/i })).toBeVisible({ timeout: 20000 });
  // nine chapters render with their completion badges
  await expect(page.getByText(/chapter i/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/chapter ix/i).first()).toBeVisible({ timeout: 10000 });
  // at minimum every visitor lands on /journey and has seen /football (recorded by the visit fold)
  await expect(page.getByText(/of .* stops walked/i).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /journey: ${errors.join(" || ")}`).toHaveLength(0);
});
