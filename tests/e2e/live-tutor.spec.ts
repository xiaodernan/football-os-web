import { test, expect } from "@playwright/test";

// M1179 · the tutor's live witness. The default suite (CI included) skips it —
// set LLM_LIVE=1 with the armed key to prove the full loop in a real browser:
//   open a lesson → the tutor panel is armed → ask about the page → the model answers
//   from the lesson's own words → the fold re-proves every numeral the model wrote
//   → either the verified teacher renders or the lesson's own portrait substitutes,
//   with the trace chips binding each step openly.
// It dials the real model with the real key. No key, no spend, no flake.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live tutor witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the tutor answers a question about this lesson and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/learn", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Expected Goals/i }).first().click();

  const input = page.locator("#tutor-ask");
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.fill("In plain words, what is an xG number telling me?");
  await page.getByRole("button", { name: "ask the teacher" }).click();

  const rail = page.locator("text=LESSON · STATEGRAPH");
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("tutor · verified answer");
  const badgeRefused = page.getByText("tutor · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["tutor · preflight", "tutor · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live tutor run: ${errors.join(" || ")}`).toHaveLength(0);
});
