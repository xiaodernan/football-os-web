import { expect, test } from "@playwright/test";

// M1151 · The Library · 读书室 — a reading room over the frozen seeded world.
test("the /library room renders its hero and finds Man City in the corpus", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/library", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the library|读书室|讀書室/i })).toBeVisible({ timeout: 20000 });

  // Type "manchester city" and let the corpus answer; the first hit is a club card linking /football/club/mci
  await page.getByLabel(/ask the corpus|问一问语料库|問一問語料庫/i).fill("manchester city");
  await expect(page.getByText(/manchester city|Manchester City/i).first()).toBeVisible({ timeout: 10000 });

  // The empty query message shows for a query with no match
  await page.getByLabel(/ask the corpus|问一问语料库|問一問語料庫/i).fill("zxqvwasdf");
  await expect(page.getByText(/nothing matched|没有匹配项|沒有匹配項/i).first()).toBeVisible({ timeout: 10000 });

  expect(errors, `console errors on /library: ${errors.join(" || ")}`).toHaveLength(0);
});
