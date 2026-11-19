import { test, expect } from "@playwright/test";

// M1197 the World Desk live witness — the eleventh imprisoned door. Armed only by
//   LLM_LIVE=1 npx playwright test tests/e2e/live-worlddesk.spec.ts
// It dials aizzz (via the local CONNECT proxy) with the real key, so CI skips it.
// Cost: one streaming completion (the envelope embeds only what the index just opened).
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live LLM witness — set LLM_LIVE=1 to arm it (it spends real tokens)");

test("the World Desk answers from the shelves, streaming honestly into the page", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/library", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });

  // the desk renders its own section and its witness chip (live path armed)
  const desk = page.getByRole("region", { name: /THE WORLD DESK|世界问答台|世界問答台/i });
  await expect(desk).toBeVisible({ timeout: 10000 });

  const input = page.locator("#world-desk-ask");
  await expect(input).toBeVisible({ timeout: 10000 });
  await expect(input).toBeEnabled();
  await input.fill("Which club leads its league?");

  const askButton = desk.getByRole("button");
  await expect(askButton.first()).toBeEnabled();
  await askButton.first().click();

  // the streaming state lands somewhere between request and resolve; what we care about
  // is the final paragraph the desk prints.
  const prose = desk.locator("p.whitespace-pre-wrap");
  await expect(prose).toBeVisible({ timeout: 30000 });

  // resolve finish: either the imprisoned badge or the folded badge renders — never silence, never a bare draft
  const verified = desk.getByText("imprisoned · every numeral holds");
  const folded = desk.getByText(/folded —|the fold answered/);
  await expect(verified.or(folded).first()).toBeVisible({ timeout: 60000 });

  const text = (await prose.innerText()).trim();
  console.log(`M1197 live witness: ${text.length} chars, badge: ${await verified.isVisible() ? "verified" : "folded"}`);
  expect(text.length, "the model wrote a real answer").toBeGreaterThan(40);
  expect(text, "the model must not reply with an error string").not.toMatch(/proxy|unauthori[sz]ed|error|no key/i);

  expect(errors, `console errors on the live run: ${errors.join(" || ")}`).toHaveLength(0);
});
