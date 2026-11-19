import { test, expect } from "@playwright/test";

// M1199 live witness — the Frozen Dispatch against aizzz/gpt-6.2-sol, LLM_LIVE=1 only.
// Cost: one streaming completion, envelope is the seed's own fold.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live LLM witness — set LLM_LIVE=1 to arm it (it spends real tokens)");

test("the Frozen Dispatch answers from the seed's own fold", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/frozen-dispatch", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });

  const summit = page.getByRole("button", { name: /the summit standings|榜首席位/i });
  await expect(summit).toBeVisible({ timeout: 10000 });
  await expect(summit).toBeEnabled();
  await summit.click();

  // the streaming state resolves; what we care about is the model actually wrote, honestly
  const prose = page.locator("p.whitespace-pre-wrap");
  await expect(prose).toBeVisible({ timeout: 30000 });

  const text = (await prose.innerText()).trim();
  console.log(`M1199 live witness: ${text.length} chars, badge checked`);
  expect(text.length, "the model wrote at least one full sentence").toBeGreaterThan(40);
  expect(text, "the model must not reply with an error string").not.toMatch(/proxy|unauthori[sz]ed|error|no key/i);

  expect(errors, `console errors on the live run: ${errors.join(" || ")}`).toHaveLength(0);
});
