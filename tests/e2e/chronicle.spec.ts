import { test, expect } from "@playwright/test";

// M1117 — The World's epic, live viewport walk. The chronicle screen must render its
// cinematic hero, the epic fixture card (seed-derived, never invented), and the LLM
// narrative panel with the armed button — nothing is clicked, because that would dial
// the real provider. The spec only asserts what the frozen world already knows.
test("The Chronicle renders its cinematic hero, the epic card and the AI panel", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/chronicle", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Chronicle" })).toBeVisible({ timeout: 20000 });
  // The epic fixture card names the winner from the seed.
  await expect(page.getByText("The epic fixture", { exact: false })).toBeVisible();
  // The AI panel renders — with the armed LLM client, its button — or its honest not-armed note.
  const ask = page.getByRole("button", { name: "Ask the chronicler for the tale" });
  const note = page.getByText("the LLM proxy is not armed");
  const askCount = await ask.count();
  const noteCount = await note.count();
  expect(askCount + noteCount, "the AI panel must render either the ask button or the not-armed note").toBeGreaterThan(0);

  await page.waitForTimeout(400);
  expect(errors, `console errors on /chronicle: ${errors.join(" || ")}`).toHaveLength(0);
});
