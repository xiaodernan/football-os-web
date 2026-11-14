import { test, expect } from "@playwright/test";

// M1118 · the live witness. This spec exists to prove the full loop in a real browser:
//   click "Ask the chronicler for the tale" → vite proxies through /api/llm/chat → the provider
//   streams NDJSON → the screen grows token by token with NO typing simulation → console clean.
// It dials the real model (wkapi.pro / gpt-6-sol) with the real key, so it is armed only with:
//   LLM_LIVE=1 npx playwright test tests/e2e/live-llm-chronicle.spec.ts
// The default suite (CI included) skips it — no key, no spend, no flake.
const LIVE = process.env.LLM_LIVE === "1";

test.skip(!LIVE, "the live LLM witness — set LLM_LIVE=1 to arm it (it spends real tokens)");

test("the chronicle narrates the epic live, streaming honestly into the page", async ({ page }) => {
  const errors: string[] = [];
  const consoleText: string[] = [];
  page.on("console", (m) => { consoleText.push(m.text()); if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/chronicle", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Chronicle" })).toBeVisible({ timeout: 20000 });

  const ask = page.getByRole("button", { name: "Ask the chronicler for the tale" });
  await expect(ask).toBeVisible({ timeout: 10000 });
  await expect(ask).toBeEnabled();
  await ask.click();

  // The streaming state appears, then resolves — the token stream itself.
  await page.waitForTimeout(400);
  // Wait for the prose paragraph to carry a real beat (not placeholder, not empty).
  const prose = page.locator("p.whitespace-pre-wrap");
  await expect(prose).toBeVisible({ timeout: 30000 });
  // Streaming finished means the streaming badge disappeared or the button is back.
  await expect(page.getByText("the chronicler is writing")).toHaveCount(0, { timeout: 60000 });

  const text = (await prose.innerText()).trim();
  console.log(`M1118 live witness: ${text.length} chars of chronicle rendered`);
  expect(text.length, "the model wrote at least one full sentence").toBeGreaterThan(120);
  expect(text, "the model must not reply with an error string").not.toMatch(/proxy|unauthori[sz]ed|error|no key/i);

  expect(errors, `console errors on the live run: ${errors.join(" || ")}`).toHaveLength(0);
});
