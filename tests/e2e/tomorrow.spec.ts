import { test, expect } from "@playwright/test";

// M1125 — Tomorrow, the chapter the world is waiting for. Read-only: the page prints one
// fixture and the Prophet-family odds against it; this spec asserts what the frozen seed
// already knows, and that the console stays clean.
test("Tomorrow renders tonight's headline fixture with its odds band", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/tomorrow", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Tomorrow" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("the chapter the world is waiting for", { exact: true })).toBeVisible();
  await expect(page.getByText("the model's read on the night", { exact: true })).toBeVisible();
  await expect(page.getByText("open tonight's fixture in the world's match room", { exact: true })).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /tomorrow: ${errors.join(" || ")}`).toHaveLength(0);
});
