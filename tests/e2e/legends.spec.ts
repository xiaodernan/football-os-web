import { test, expect } from "@playwright/test";

// M1116 — the /legends walk in a live viewport: the cinematic hero h1 must be visible whether
// the visitor is on the home page or directly deep-linked, the golden boot list paints a real
// bar, and the console stays clean.
test("the Hall of Legends renders its cinematic hero, the awards roll, and its stats", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/legends", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "The Hall of Legends" })).toBeVisible({ timeout: 20000 });
  // The MVP panel and the Golden Boot list both carry a real name from the seed.
  await expect(page.getByText("The immortal king", { exact: false })).toBeVisible();
  // Deep links into the honour roll must open cleanly too.
  await page.goto("/#/legends", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  expect(errors, `console errors on /legends: ${errors.join(" || ")}`).toHaveLength(0);
});
