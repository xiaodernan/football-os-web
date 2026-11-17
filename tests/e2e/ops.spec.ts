import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1149 · the operator console: passcode gate, then the seeded cohort folds and every panel renders.
test("the /ops console refuses a wrong passcode and opens on 123", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("000000");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();
  await expect(page.getByText(/wrong passcode|口令不对|口令不對/i)).toBeVisible({ timeout: 5000 });

  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();
  await expect(page.getByText(/session count|会话|會話/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/top screens by visits|最常看的屏|最常看的屏/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/the model's ledger|模型经济账|模型經濟帳/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/the prescription|处方签|處方箋/i).first()).toBeVisible({ timeout: 10000 });
  expect(errors, `console errors on /ops: ${errors.join(" || ")}`).toHaveLength(0);
});

test("the tide panel reads the fortnight on /ops", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });

  await page.getByLabel(/shared passcode/i).fill("123");
  await page.getByRole("button", { name: /open the console/i }).click();

  // The tide band renders with its kicker, sparkline image and a direction chip.
  await expect(page.getByText(/the tide/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("img", { name: /fourteen-day traffic sparkline/i }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/ascending|steady|declining/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/forecast/i).first()).toBeVisible({ timeout: 10000 });

  expect(errors, `console errors on the tide panel: ${errors.join(" || ")}`).toHaveLength(0);
});

test("the command palette can goto /ops", async ({ page }) => {
  await completeOnboarding(page, "Ops Visitor");
  await page.keyboard.press("Control+k");
  const input = page.getByPlaceholder(/Search players/).first();
  await expect(input).toBeVisible({ timeout: 5000 });
  const modal = page.locator("[role=dialog]");
  await expect(modal.getByText(/pulse|巡检|巡檢/i).first()).toBeVisible({ timeout: 10000 });
  await page.keyboard.press("Escape");
});
