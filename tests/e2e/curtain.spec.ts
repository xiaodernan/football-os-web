import { expect, test } from "@playwright/test";

// M1162 · Curtain Up — the next round every real league has to play, as committed.
test("the /curtain-up screen renders the round cards with fixture rows", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/curtain-up", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /curtain up|升帐时刻|升幕時刻/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Premier League/).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Matchday \d+/).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /curtain-up: ${errors.join(" || ")}`).toHaveLength(0);
});
