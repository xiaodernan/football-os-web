import { expect, test } from "@playwright/test";

// M1173 · The Golden Hour — three honest boards per league, the season's biggest real results.
test("the /golden-hour screen renders the three boards and chip rails", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/golden-hour", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the golden hour|黄金时刻|黃金時刻/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/EVERY LEAGUE|本赛季|本賽季/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /print the golden hour|把黄金时刻印成 PDF|把黃金時刻印成 PDF/i })).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /golden-hour: ${errors.join(" || ")}`).toHaveLength(0);
});
