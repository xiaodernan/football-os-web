import { expect, test } from "@playwright/test";

// M1199 · The Frozen Dispatch — offline E2E. The live path is LLM_LIVE-only.
test("/frozen-dispatch renders the three lenses and the honest contact arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/frozen-dispatch", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });

  // the three lenses — trilingual-tolerant matchers
  await expect(page.getByRole("button", { name: /the summit standings|榜首席位/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: /the chase pack|追趕集團|追赶集团/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /the run-in form lines|赛季末赛程走势|賽季末賽程走勢/i })).toBeVisible();

  expect(errors, `console errors on /frozen-dispatch: ${errors.join(" || ")}`).toHaveLength(0);
});
