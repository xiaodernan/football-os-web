import { test, expect } from "@playwright/test";

// M1185 · the analyst's live witness. The default suite (CI included) skips it — set LLM_LIVE=1
// with the armed key to prove the full loop in a real browser:
//   open /ops → login → run the analyst → the model streams → the fold re-proves every numeral →
//   either "analyst · verified reading" or "analyst · fold answered" — both honest arrivals.
// Same idiom as the consultation witness.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live analyst witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the analyst reasons over the pulse fold and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  const runBtn = page.getByRole("button", { name: /run the analyst|叫分析师过来|叫分析師過來/i });
  await expect(runBtn).toBeVisible({ timeout: 10000 });
  await runBtn.click();

  const rail = page.locator("text=ANALYST · STATEGRAPH").or(page.locator("text=分析师 · 状态图")).or(page.locator("text=分析師 · 狀態圖"));
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("analyst · verified reading");
  const badgeRefused = page.getByText("analyst · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["analyst · preflight", "analyst · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live analyst run: ${errors.join(" || ")}`).toHaveLength(0);
});
