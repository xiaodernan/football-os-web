import { test, expect } from "@playwright/test";

// M1181 · the librarian's live witness. The default suite (CI included) skips it —
// set LLM_LIVE=1 with the armed key to prove the full loop in a real browser:
//   open the embedded manual → ask about it on the board → the model streams →
//   the fold re-proves every numeral the model wrote → either the verified librarian
//   answers or the fold substitutes, with the trace chips binding each step openly.
// Same idiom as live-llm-chronicle.spec.ts.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live librarian witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the manual's own librarian answers a question about the book and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/manual", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Football OS Manual" }).first()).toBeVisible({ timeout: 20000 });

  const input = page.locator("#librarian-ask");
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.fill("If I want to understand the spring cloud plane, which chapter should I read?");
  await page.getByRole("button", { name: "ask the librarian" }).click();

  const rail = page.locator("text=MANUAL · STATEGRAPH").or(page.locator("text=手册 · 状态图"));
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("librarian · verified reading");
  const badgeRefused = page.getByText("librarian · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["librarian · preflight", "librarian · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live librarian run: ${errors.join(" || ")}`).toHaveLength(0);
});
