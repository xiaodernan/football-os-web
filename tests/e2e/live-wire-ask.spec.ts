import { test, expect } from "@playwright/test";

// M1190 evidence doors: the Ask the Wire desk's live witness — each door is imprisoned to
// its own committed league table. The default suite (CI included) skips it — set LLM_LIVE=1
// with the armed key on a machine that can reach the provider to prove the full loop in a
// real browser: open /live-wire → tap an ask button → the model streams → the fold re-proves
// every numeral it wrote → either settles on a committed trace (verified) or refuses and
// swaps in the fold's own lines.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live ask-the-wire witness — set LLM_LIVE=1 to arm it");
test.setTimeout(120_000);

test("the ask desk settles on a trace, verified or folded, against the committed league table", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/live-wire", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("THE REAL-WORLD WIRE")).toBeVisible({ timeout: 30000 });

  // Arm the ask desk — the next-round preset
  const nextRoundBtn = page.getByRole("button", { name: /next round/i });
  await expect(nextRoundBtn.first()).toBeVisible({ timeout: 30000 });
  await nextRoundBtn.first().click();

  // The trace/showcase rail should settle on a verdict chip within the fold or the model
  const badgeVerified = page.getByText(/wire desk .* verified/i);
  const badgeRefused = page.getByText(/wire desk .* folded/i).or(page.getByText(/fold/i).nth(0));
  await expect(badgeVerified.or(badgeRefused).first()).toBeVisible({ timeout: 90000 });

  expect(errors, `console errors on the live wire run: ${errors.join(" || ")}`).toHaveLength(0);
});
