import { test, expect } from "@playwright/test";

// M1187 · The Latch — keyless-vs-armed rendering coverage. CI runs keyless.
test("the latch panel renders its kicker, armed button or keyless note, and zero console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/THE LATCH|定步/i).first()).toBeVisible({ timeout: 5000 });
  const keyless = await page.getByText(/the model is asleep in this build|模型没醒|模型沒醒/i).count();
  const armed = await page.getByRole("button", { name: /pull the latch|拍下这一步|拍下這一步/i }).count();
  expect(keyless + armed, "the latch panel renders either the armed button or the keyless note").toBeGreaterThan(0);

  expect(errors, `console errors on /ops latch: ${errors.join(" || ")}`).toHaveLength(0);
});
