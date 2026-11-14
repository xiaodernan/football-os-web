import { test, expect } from "@playwright/test";

// M1117 — The World's epic, live viewport walk. The chronicle screen must render its
// cinematic hero, the epic fixture card (seed-derived, never invented), and the LLM
// narrative panel — nothing is clicked on the AI button, because that would dial
// the real provider. The spec only asserts what the frozen world already knows.
// M1118 — neighbour tales deep-link to the app's real match detail route (/matches/:id).
test("the Chronicle renders its cinematic hero, the epic card and the AI panel", async ({ page }) => {
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

test("the chronicle neighbour tales open at the real match route, never a 404", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/chronicle", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Chronicle" })).toBeVisible({ timeout: 20000 });
  const neighbour = page.locator("a[href^=\"#/matches/\"]").first();
  await expect(neighbour).toBeVisible({ timeout: 10000 });
  await neighbour.click();
  await expect(page).toHaveURL(/#\/matches\//, { timeout: 15000 });
  expect(errors, `console errors after the neighbour click: ${errors.join(" || ")}`).toHaveLength(0);
});
