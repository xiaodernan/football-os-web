import { expect, test } from "@playwright/test";

// M1164 · The Ledger — the wire's own arithmetic, laid flat.
test("the /wire-ledger screen renders the league cards with arithmetic rows", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/wire-ledger", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the ledger|电波账本|電波帳本/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Premier League/).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/the sharpest attack/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/the file checks its homework/i).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /wire-ledger: ${errors.join(" || ")}`).toHaveLength(0);
});
