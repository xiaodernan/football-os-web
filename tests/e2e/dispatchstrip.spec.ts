import { test, expect } from "@playwright/test";

// M1188 · The Dispatch on /ops — keyless-vs-armed rendering coverage. CI runs keyless.
test("the ops dispatch strip renders its kicker, armed button or keyless note, and zero console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/THE DISPATCH|派单|派單/i).first()).toBeVisible({ timeout: 5000 });
  const keyless = await page.getByText(/the model is asleep in this build|模型没醒|模型沒醒/i).count();
  const armed = await page.getByRole("button", { name: /dispatch the order|派这一单|派這一單/i }).count();
  expect(keyless + armed, "the ops dispatch strip renders either the armed button or the keyless note").toBeGreaterThan(0);

  expect(errors, `console errors on /ops dispatch strip: ${errors.join(" || ")}`).toHaveLength(0);
});
