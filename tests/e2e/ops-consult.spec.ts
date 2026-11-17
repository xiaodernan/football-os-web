import { test, expect } from "@playwright/test";

// M1178 · The Consultation — the keyless witness. CI runs without VITE_LLM_ENABLED on the
// preview server, so the consultation section prints the frozen-fold note instead of an
// ask button. Either way the section must render one of the two honest states, and the
// 123 console must open. No spend.
test("the operator console opens with the public passcode and shows the consultation's honest arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await page.locator("#ops-pass").fill("123");
  await page.getByRole("button", { name: "open the console" }).click();

  const heading = page.getByRole("heading", { name: "THE CONSULTATION" });
  await expect(heading).toBeVisible({ timeout: 20000 });

  const ask = page.getByRole("button", { name: "let the desk read the prescription aloud" });
  const askCount = await ask.count();
  const noteCount = await page.getByText("the model is asleep in this build").count();
  expect(askCount + noteCount, "the consultation must render either the ask button or the keyless note, never neither").toBeGreaterThan(0);
  expect(errors, `console errors on /ops: ${errors.join(" || ")}`).toHaveLength(0);
});
