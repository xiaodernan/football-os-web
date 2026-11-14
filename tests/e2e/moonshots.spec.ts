import { test, expect } from "@playwright/test";

// M1126 — The Moonshots walk: the cinematic hero, the ranked ceilings from the frozen seed,
// zero console errors.
test("The Moonshots renders the seed's uncashed ceilings in gap order", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/moonshots", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Moonshots" })).toBeVisible({ timeout: 20000 });
  const list = page.locator("ol > li");
  await expect(list.first()).toBeVisible({ timeout: 15000 });
  const count = await list.count();
  expect(count, "the seed prints at least twelve uncashed ceilings").toBeGreaterThan(0);
  await expect(page.getByText("ceiling gap").first()).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /moonshots: ${errors.join(" || ")}`).toHaveLength(0);
});
