import { expect, test } from "@playwright/test";

test("the /wire-diary screen renders the seven model-spoken paragraphs", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/wire-diary", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the wire diary|电波日记|電波日記/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Borussia Dortmund|Premier League|FC Barcelona/).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /print the wire diary|把电波日记印成 PDF|把電波日記印成 PDF/i })).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /wire-diary: ${errors.join(" || ")}`).toHaveLength(0);
});
