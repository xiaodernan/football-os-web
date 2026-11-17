import { test, expect } from "@playwright/test";

// M1179 · The Tutor — the keyless witness. CI runs without VITE_LLM_ENABLED on the
// preview server, so the tutor section prints the frozen-lesson note instead of an ask
// form. Either way the section must render one of the two honest states, and the lesson
// detail must open from the curriculum home. No spend.
test("the lesson's tutor panel opens with the lesson and shows its honest arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/learn", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Expected Goals/i }).first().click();

  const heading = page.getByRole("heading", { name: "ASK THE TEACHER" });
  await expect(heading).toBeVisible({ timeout: 20000 });

  const ask = page.locator("#tutor-ask");
  const askCount = await ask.count();
  const noteCount = await page.getByText("the model is asleep in this build").count();
  expect(askCount + noteCount, "the tutor panel must render either the ask form or the keyless note, never neither").toBeGreaterThan(0);
  expect(errors, `console errors on /learn lesson detail: ${errors.join(" || ")}`).toHaveLength(0);
});
