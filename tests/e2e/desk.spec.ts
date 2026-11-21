import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1235 — the training desk: the seventeenth door, the second that decides. Without a reachable
// model the door answers with the fold's own prescription, openly labelled — which is what a
// fresh test device has. The dossier names the player and the weakest attributes.
test("the training desk prescribes from the player's own dossier", async ({ page }) => {
  await completeOnboarding(page, "Desk Visitor");
  await page.goto("/#/desk");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Training Desk" })).toBeVisible();
  await expect(page.getByText(/The model reads your player's dossier and prescribes the week/)).toBeVisible();

  // The dossier panel names the player and shows the weakest attributes as figures.
  await expect(page.getByText(/Desk Visitor · the dossier in the desk's hands/)).toBeVisible();

  // The fold's prescription is on screen before anyone asks — the honest default.
  await expect(page.getByText("The fold's prescription")).toBeVisible();

  // Asking without a reachable model lands on the fold arm, labelled.
  await page.getByRole("button", { name: "Ask the desk" }).click();
  await expect(page.getByText(/could not answer through the model/).first()).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");
});
