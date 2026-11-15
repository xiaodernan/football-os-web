import { expect, test } from "@playwright/test";

// M1155 · The Grand Tour — the seven wires told as one epic, straight off the committed artifact.
// Assert shape and interaction only; the artifact moves weekly.
test("the /grand-tour screen renders the chase, the seven leaders and the loudest results", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/grand-tour", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the grand tour|冠之巡礼|冠之巡禮/i })).toBeVisible({ timeout: 20000 });
  // the chase board lists all seven wires with their status pills
  await expect(page.getByText(/crown alive|冠军仍在争|冠軍仍在爭/i).first()).toBeVisible({ timeout: 10000 });
  // at least one real club name from the committed wire renders (data-agnostic substring list)
  await expect(page.getByText(/Bundesliga|Premier League|Serie A|Eredivisie|Primeira Liga|Primera División|Ligue 1/i).first()).toBeVisible();
  expect(errors, `console errors on /grand-tour: ${errors.join(" || ")}`).toHaveLength(0);
});
