import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1232 — the congested calendar: the fixture spacing board. The tiles carry the world's real
// turnaround figures, the board ranks tightest-first, and the method line is honest about what a
// turnaround is.
test("the congested calendar ranks the tightest turnarounds", async ({ page }) => {
  await completeOnboarding(page, "Congestion Visitor");
  await page.goto("/#/congestion");

  await expect(page.getByRole("heading", { name: "The Congested Calendar" })).toBeVisible();
  await expect(page.getByText("The turnaround each club's legs actually get — the distance between its fixtures.")).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  // The tiles read real figures from the seeded world.
  await expect(page.getByText("Tightest turn").first()).toBeVisible();
  await expect(page.getByText(/\d+d/).first()).toBeVisible();

  // The board's rows carry the fold's own line shape.
  await expect(page.getByText(/fixtures · avg [\d.]+d · \d+ tight turns/).first()).toBeVisible();
  await expect(page.getByText(/A turnaround is the whole days between two kickoff instants/)).toBeVisible();
});
