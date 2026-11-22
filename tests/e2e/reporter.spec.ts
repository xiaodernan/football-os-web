import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1236 — the match reporter: door 18, the one that writes the game. The desk opens on the most
// recent finished fixture with events; the fold's own report is on screen before anyone asks,
// and asking without a reachable model lands on the fold arm, labelled.
test("the match reporter opens a real fixture and folds its own report", async ({ page }) => {
  await completeOnboarding(page, "Reporter Visitor");
  await page.goto("/#/reporter");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Match Reporter" })).toBeVisible();
  await expect(page.getByText(/The model writes the report of one real fixture/)).toBeVisible();

  // The desk's fixture is a real one from the seeded world, with a real score.
  await expect(page.getByText(/v .* · the fixture on the desk/)).toBeVisible();
  await expect(page.getByText(/recorded events the report may draw on/)).toBeVisible();

  // The fold's report is on screen before anyone asks — the honest default.
  await expect(page.getByText(/The fold's report/).first()).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");
});
