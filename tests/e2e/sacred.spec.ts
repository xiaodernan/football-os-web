import { expect, test } from "@playwright/test";

// M1160 · The Long Season — every fixture of the seven real leagues, browsable.
test("the /long-season screen renders the tabs, the filters and the matchday cards", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/long-season", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /fixtures, one calendar|漫长的球季|漫長的球季/i })).toBeVisible({ timeout: 20000 });
  // the league chips render (seven public top flights)
  await expect(page.getByRole("button", { name: /Premier League/i }).first()).toBeVisible({ timeout: 10000 });
  // at least one matchday heading renders
  await expect(page.getByText(/^Matchday \d+/i).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /long-season: ${errors.join(" || ")}`).toHaveLength(0);
});
