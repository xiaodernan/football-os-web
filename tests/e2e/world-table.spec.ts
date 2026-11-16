import { expect, test } from "@playwright/test";

// M1165 · The World Table — one Elo ordering across seven real leagues.
test("the /world-table screen renders the board and both rails", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/world-table", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the world table|欧陆最强榜|歐陸最強榜/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/FC Barcelona/).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/arithmetic, witnessed/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /print the world table/i })).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /world-table: ${errors.join(" || ")}`).toHaveLength(0);
});
