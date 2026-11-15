import { expect, test } from "@playwright/test";

// M1156 · The Dispatch — the seven live wires folded into an A4 broadsheet.
test("the /dispatch screen renders the edition stamp, the tables and the chase", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/dispatch", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the wire dispatch|电波通稿|電波通稿/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/edition|版次|版次/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("PTS").first()).toBeVisible();
  await expect(page.getByText("GD").first()).toBeVisible();
  expect(errors, `console errors on /dispatch: ${errors.join(" || ")}`).toHaveLength(0);
});
