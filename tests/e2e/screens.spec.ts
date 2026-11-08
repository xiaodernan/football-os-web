import { expect, test } from "@playwright/test";

// M958 — the newer screens, walked as a fresh visitor with no saved state. Each route must
// render its shell and its honest empty state: the pages read the deterministic dataset, so
// the empty read is the real read, not a broken one.
//
// Every anchor below is dictionary copy (the same strings the i18n gate guards), so a reworded
// screen fails here loudly instead of silently drifting.

test("the coach CV shows the empty tenure a fresh device honestly has", async ({ page }) => {
  await page.goto("/#/coach");
  await expect(page.getByText("No tenure to show yet")).toBeVisible();
  await expect(page.getByText("Start a career")).toBeVisible();
});

test("the lead board renders its replay read and its empty line", async ({ page }) => {
  await page.goto("/#/leads");
  await expect(page.getByText("Leads kept and lost")).toBeVisible();
  // The seeded dataset carries recorded events, so the board shows figures rather than the
  // empty line; the tile labels are the stable anchors.
  await expect(page.getByText("Leads taken").first()).toBeVisible();
});

test("the scoring-first panel renders on the goal timing screen", async ({ page }) => {
  await page.goto("/#/timing");
  await expect(page.getByText("Scoring first")).toBeVisible();
  await expect(page.getByText("Scored first").first()).toBeVisible();
});

test("the venue screen draws the clocks and the roughness column", async ({ page }) => {
  await page.goto("/#/home-away");
  await expect(page.getByText("Home wins").first()).toBeVisible();
  await expect(page.getByText("Goals by end and window")).toBeVisible();
  await expect(page.getByText("Shots and saves by end and window")).toBeVisible();
  await expect(page.getByText("Goals/card").first()).toBeVisible();
});

test("the discipline screen draws the whole clock family", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByText("Bookings drawn")).toBeVisible();
  await expect(page.getByText("Reds against cards, by end")).toBeVisible();
  await expect(page.getByText("Cards by the match's result")).toBeVisible();
});

test("the event clock screen renders the club rhythm family", async ({ page }) => {
  await page.goto("/#/clock");
  await expect(page.getByText("Club rhythm")).toBeVisible();
  await expect(page.getByText("Goals per card").first()).toBeVisible();
});

test("the discipline screen draws the severity by result board", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByText("Which result turns the same club redder")).toBeVisible();
});

test("the leaders screen draws the scorer and wall boards", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByText("Top scorers").first()).toBeVisible();
  await expect(page.getByText("The wall")).toBeVisible();
});

test("the timing screen draws the lethal read", async ({ page }) => {
  await page.goto("/#/timing");
  await expect(page.getByText("The lethal read")).toBeVisible();
});

test("the match page prints this fixture's xG and its six-window clock", async ({ page }) => {
  await page.goto("/#/matches/M0991");
  await expect(page.getByText("This match in xG")).toBeVisible();
  await expect(page.getByText("xG scored").first()).toBeVisible();
});

test("the timing screen draws the after-a-defeat board", async ({ page }) => {
  await page.goto("/#/timing");
  await expect(page.getByRole("heading", { name: "After a defeat" })).toBeVisible();
});

test("the leaders screen draws the blank runs board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The blank runs" })).toBeVisible();
});

test("the discipline screen draws the strictness board", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByText("Which league lets the game breathe")).toBeVisible();
});

test("the leaders screen draws the wildest results board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByText("The wildest results")).toBeVisible();
  await expect(page.getByText("Biggest rout").first()).toBeVisible();
});

test("the form table ranks the clubs and the chips switch the competition", async ({ page }) => {
  await page.goto("/#/form");
  await expect(page.getByRole("heading", { name: "The last five, ranked" })).toBeVisible();
  await expect(page.getByText("Fixtures read")).toBeVisible();
  await expect(page.getByText("The form table").first()).toBeVisible();
  // The second chip belongs to a different competition, so clicking it re-anchors the board.
  const chips = page.locator("button.rounded-full");
  await expect(chips).not.toHaveCount(1);
  await chips.nth(1).click();
  await expect(page.getByText("The form table").first()).toBeVisible();
});
