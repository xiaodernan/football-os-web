import { test, expect } from "@playwright/test";

// M1177 · the studio's live witness. The default suite (CI included) skips this —
// set LLM_LIVE=1 with the armed key to prove the full loop in a real browser:
//   click "get the desk's take" → vite proxies through /api/llm/chat → provider streams NDJSON
//   → the desk walks preflight → build → model → precommit → commit (or refuses to the fold)
//   → the trace rail settles with chips for every stage the desk actually passed.
// It dials the real model with the real key. No key, no spend, no flake — same idiom as
// live-llm-chronicle.spec.ts.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live studio witness — set LLM_LIVE=1 to arm it (it spends real tokens)");
test.setTimeout(120_000);

test("the studio interrogates the seed and settles on a trace, verified or folded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/dossier", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /the last page/i })).toBeVisible({ timeout: 20000 });

  const ask = page.getByRole("button", { name: "get the desk's take" });
  await expect(ask).toBeVisible({ timeout: 10000 });
  await ask.click();

  // The rail settles: chips carry the stages the desk really walked, and the badge says
  // which door it went out. Verified OR fold-answered — both are honest arrivals.
  const rail = page.locator("text=SCOUT STUDIO");
  await expect(rail.first()).toBeVisible({ timeout: 90000 });
  const badgeVerified = page.getByText("studio · verified answer");
  const badgeRefused = page.getByText("studio · fold answered");
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  for (const stage of ["studio · preflight", "studio · build"]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }

  expect(errors, `console errors on the live studio run: ${errors.join(" || ")}`).toHaveLength(0);
});
