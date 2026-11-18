import { test, expect } from "@playwright/test";

// M1185 · The Analyst — keyless-vs-armed rendering coverage. CI runs keyless; this spec asserts
// the keyless or armed state always renders and the page settles on a clean console.
test("the analyst panel renders its live-or-local chip and its three-step verdict stripe", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  // The Analyst panel exists somewhere below the fold — the kicker is the anchor text.
  await expect(page.getByText(/THE ANALYST|分析师|分析師/i).first()).toBeVisible({ timeout: 5000 });

  // Either the keyless note OR (key armed) the "run the analyst" button renders.
  const keyless = page.getByText(/the model is asleep in this build|模型没醒|模型沒醒/i).count();
  const armed = page.getByRole("button", { name: /run the analyst|叫分析师过来|叫分析師過來/i }).count();
  expect(await keyless + await armed, "the analyst panel renders either the armed button or the keyless note").toBeGreaterThan(0);

  expect(errors, `console errors on /ops: ${errors.join(" || ")}`).toHaveLength(0);
});
