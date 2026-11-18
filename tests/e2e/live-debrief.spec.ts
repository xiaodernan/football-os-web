import { test, expect } from "@playwright/test";

// M1190 · the debrief's live witness. The default suite (CI included) skips it — set LLM_LIVE=1
// with the armed key to prove the full loop in a real browser:
//   open /ops → login → produce the debrief → the model streams → the fold re-proves every numeral →
//   either "debrief · verified letter" or "debrief · fold answered" — both honest arrivals.
// Same idiom as the analyst witness.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live debrief witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the debrief writes the month's envelope back to the operator and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  const runBtn = page.getByRole("button", { name: /produce the debrief|出月报|出月報/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });
  await runBtn.click();

  const rail = page.locator("text=DEBRIEF · STATEGRAPH").or(page.locator("text=复盘 · 状态图")).or(page.locator("text=復盤 · 狀態圖"));
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("debrief · verified letter");
  const badgeRefused = page.getByText("debrief · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["debrief · preflight", "debrief · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live debrief run: ${errors.join(" || ")}`).toHaveLength(0);
});
