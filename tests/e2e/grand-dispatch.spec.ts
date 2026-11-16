import { expect, test } from "@playwright/test";

// M1169 · The Grand Dispatch — the week's honest edition in one tap.
test("the /grand-dispatch screen renders the awaiting panel and the press affordance", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/grand-dispatch", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the grand dispatch|电波发行日|電波發行日/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: /write the grand dispatch|动笔写一稿|動筆寫一稿/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/EVERY LEAGUE, ONE HONEST DISPATCH/i)).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /grand-dispatch: ${errors.join(" || ")}`).toHaveLength(0);
});
