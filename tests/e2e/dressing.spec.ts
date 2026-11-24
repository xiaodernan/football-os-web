import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1242 — the dressing room: door 20, the one that briefs the next match. The desk opens on the
// next fixture's opponent with their own record; the fold's briefing is the record as data; asking
// without a reachable model lands on the fold arm, labelled.
test("the dressing room briefs the next opponent", async ({ page }) => {
  await completeOnboarding(page, "Dressing Visitor");
  await page.goto("/#/dressing");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Dressing Room" })).toBeVisible();
  await expect(page.getByText(/The model briefs the dressing room on the next opponent/)).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  // The opponent's own record is on the board (record tile, goals tile, the danger).
  await expect(page.getByText("Record (W-D-L)").first()).toBeVisible();
  await expect(page.getByText("Last five").first()).toBeVisible();

  // The fold's briefing is on screen before anyone asks — the honest default.
  await expect(page.getByText("The fold's briefing").first()).toBeVisible();

  // Asking without a reachable model lands on the fold arm, labelled.
  await page.getByRole("button", { name: "Brief the dressing room" }).click();
  await expect(page.getByText(/could not answer through the model/).first()).toBeVisible();
});
