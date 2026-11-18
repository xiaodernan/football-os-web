import { test, expect } from "@playwright/test";

// M1186 · The Debrief — keyless-vs-armed rendering coverage. CI runs keyless.
test("the debrief panel renders its kicker, armed button or keyless note, and zero console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/THE DEBRIEF|复盘|復盤/i).first()).toBeVisible({ timeout: 5000 });
  const keyless = page.getByText(/the model is asleep in this build|模型没醒|模型沒醒|模型沒醒/i).count();
  const armed = page.getByRole("button", { name: /produce the debrief|出月報/i }).count();
  expect(await keyless + await armed, "the debrief panel renders either the armed button or the keyless note").toBeGreaterThan(0);

  expect(errors, `console errors on /ops debrief: ${errors.join(" || ")}`).toHaveLength(0);
});
