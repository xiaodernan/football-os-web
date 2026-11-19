import { expect, test } from "@playwright/test";

// M1217 · The Witness Bench — offline E2E. The model-driven arm is LLM_LIVE-only.
test("/witness-bench renders the three lenses and the honest keyless arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/witness-bench", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });

  await expect(page.getByRole("button", { name: /the crown and its margins|榜首与分差|榜首與分差/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /the chase and the gap|追赶集团与差距|追趕集團與差距/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /the late-season form lines|赛季末走势|賽季末走勢/i })).toBeVisible();

  expect(errors, `console errors on /witness-bench: ${errors.join(" || ")}`).toHaveLength(0);
});
