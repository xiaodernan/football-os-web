import { test, expect } from "@playwright/test";

// M1178 · the consultation's live witness. The default suite (CI included) skips it —
// set LLM_LIVE=1 with the armed key to prove the full loop in a real browser:
//   open the console with the public passcode → the prescription folds → the desk reads it
//   → the model streams → the fold re-proves every number the model wrote → either the
//   verified reading renders or the fold's own portrait substitutes, with the trace chips
//   binding each step openly.
// It dials the real model with the real key. No key, no spend, no flake — same idiom as
// live-llm-chronicle.spec.ts.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live consultation witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the console opens its consultation and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await page.locator("#ops-pass").fill("123");
  await page.getByRole("button", { name: "open the console" }).click();

  const ask = page.getByRole("button", { name: "let the desk read the prescription aloud" });
  await expect(ask).toBeVisible({ timeout: 20000 });
  await ask.click();

  const rail = page.locator("text=CONSULTATION · STATEGRAPH").or(page.locator("text=会诊台 · 状态图"));
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("consult · verified reading");
  const badgeRefused = page.getByText("consult · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["consult · preflight", "consult · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live consultation run: ${errors.join(" || ")}`).toHaveLength(0);
});
