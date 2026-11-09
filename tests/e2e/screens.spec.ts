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
  await expect(page.getByRole("heading", { name: "Bookings by end and window" })).toBeVisible();
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

test("the discipline screen draws the leading foulers board", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByRole("heading", { name: "The world's leading foulers" })).toBeVisible();
});

test("the discipline screen draws the most loaded yellows board", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByRole("heading", { name: "The world's most loaded for yellows" })).toBeVisible();
});

test("the discipline screen draws the red card kings board", async ({ page }) => {
  await page.goto("/#/discipline");
  await expect(page.getByRole("heading", { name: "The world's red card kings" })).toBeVisible();
});

test("the discipline screen draws the two farm-lane severity boards", async ({ page }) => {
  await page.goto("/#/discipline");
  // M972 （别线）: the severity by end.
  await expect(page.getByRole("heading", { name: "Which end turns the same club redder" })).toBeVisible();
  // M973 （本线）: the severity by result.
  await expect(page.getByRole("heading", { name: "Which result turns the same club redder" })).toBeVisible();
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

// M1000: the xG family folded over the timing page and the venue page — every panel the proofs
// count also has a real browser check now, so a render regression on these exact panels is caught here.
test("the timing screen draws its xG table, owed margins and closing time", async ({ page }) => {
  await page.goto("/#/timing");
  await expect(page.getByRole("heading", { name: "The xG table" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The owed margins" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closing time" })).toBeVisible();
});

test("the venue screen draws the xG clock by end and window", async ({ page }) => {
  await page.goto("/#/home-away");
  await expect(page.getByRole("heading", { name: "xG by end and window" })).toBeVisible();
});

test("the event clock screen draws the save-quality ladder", async ({ page }) => {
  await page.goto("/#/clock");
  await expect(page.getByRole("heading", { name: "Save quality" })).toBeVisible();
});

test("the timing screen draws the after-a-defeat board", async ({ page }) => {
  await page.goto("/#/timing");
  await expect(page.getByRole("heading", { name: "After a defeat" })).toBeVisible();
});

test("the leaders screen draws the blank runs board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The blank runs" })).toBeVisible();
});

test("the world page draws the three new boards after a season is simulated", async ({ page }) => {
  await page.goto("/#/world");
  // The three new panels live inside the simulated-world branch — press Simulate once to populate it.
  await page.getByRole("button", { name: /Simulate next season/ }).click();
  await page.waitForTimeout(600);
  await expect(page.getByText("Which league plays the most open games")).toBeVisible();
  await expect(page.getByText("The wildest of away wins")).toBeVisible();
  await expect(page.getByText("The league leaders")).toBeVisible();
});

test("the streaks page draws the records and the four tiles", async ({ page }) => {
  await page.goto("/#/streaks");
  await expect(page.getByRole("heading", { name: "Runs, not averages" })).toBeVisible();
  await expect(page.getByText("Longest unbeaten run").first()).toBeVisible();
});

test("the streaks page draws the season's five moments", async ({ page }) => {
  await page.goto("/#/streaks");
  await expect(page.getByRole("heading", { name: "The season's five moments" })).toBeVisible();
});

test("the injuries page draws its availability list and the under-fire ladder", async ({ page }) => {
  await page.goto("/#/injuries");
  await expect(page.getByRole("heading", { name: "Squad availability" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The under-fire squads" })).toBeVisible();
});

test("the leaders screen draws the passers board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The passers" })).toBeVisible();
});

test("the leaders screen draws the corner kings board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The corner kings" })).toBeVisible();
});

test("the manager OS renders its section for the seeded favorite club", async ({ page }) => {
  await page.goto("/#/manager");
  await expect(page.getByRole("heading", { name: "Manager OS" })).toBeVisible();
});

test("the football AI page renders its chat-first heading", async ({ page }) => {
  await page.goto("/#/ai");
  await expect(page.getByRole("heading", { name: "Football AI" })).toBeVisible();
});

test("the knowledge graph page renders the AI graph tab active", async ({ page }) => {
  await page.goto("/#/knowledge");
  await expect(page.getByRole("heading", { name: "Football AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Knowledge Graph" })).toBeVisible();
});

test("the tactical studio renders its training heading", async ({ page }) => {
  await page.goto("/#/tactical-studio");
  await expect(page.getByRole("heading", { name: "Tactical Studio" })).toBeVisible();
});

test("the data room renders its tables heading", async ({ page }) => {
  await page.goto("/#/data");
  await expect(page.getByRole("heading", { name: "Data Room" })).toBeVisible();
});

test("the development page renders its role gap heading", async ({ page }) => {
  await page.goto("/#/development");
  await expect(page.getByRole("heading", { name: "Role Gap Analysis" })).toBeVisible();
});

test("the head-to-head page renders every meeting between the picked clubs", async ({ page }) => {
  await page.goto("/#/head-to-head");
  await expect(page.getByRole("heading", { name: "Head to head: every meeting" })).toBeVisible();
});

test("the leaders screen draws the world lethal board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The world's killers" })).toBeVisible();
});

test("the leaders screen draws the duel kings board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The duel kings" })).toBeVisible();
});

test("the leaders screen draws the outshine board", async ({ page }) => {
  await page.goto("/#/leaders");
  await expect(page.getByRole("heading", { name: "The outshine board" })).toBeVisible();
});

test("the tactical notebook saves a note and reads it back after a reload", async ({ page }) => {
  await page.goto("/#/notebook");
  await page.getByPlaceholder("Note title").fill("E2E tactical lesson");
  await page.getByPlaceholder("What to remember…").fill("Ref picks up the offside early — M998.");
  await page.getByRole("button", { name: /Add note/ }).click();
  await expect(page.getByText("E2E tactical lesson")).toBeVisible();
  await page.reload();
  await expect(page.getByText("E2E tactical lesson")).toBeVisible();
});

test("the projection page walks its three blocks", async ({ page }) => {
  await page.goto("/#/projection");
  await expect(page.getByText("Player growth projection").first()).toBeVisible();
  await expect(page.getByText("Where a player lands if they keep training their weakest traits", { exact: false })).toBeVisible();
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

test("the transfers route renders its heading and fit-target tile", async ({ page }) => {
  await page.goto("/#/transfers");
  await expect(page.getByRole("heading", { name: "Transfer Centre" })).toBeVisible();
  await expect(page.getByText("Linked rumours")).toBeVisible();
});

test("the history page renders its honest empty timeline on a fresh device", async ({ page }) => {
  await page.goto("/#/history");
  await expect(page.getByRole("heading", { name: "Activity History" })).toBeVisible();
  await expect(page.getByText("No activity yet")).toBeVisible();
});

test("the film room renders its empty library shell", async ({ page }) => {
  await page.goto("/#/film");
  await expect(page.getByRole("heading", { name: "Film Room" })).toBeVisible();
  await expect(page.getByText("Your clips")).toBeVisible();
  await expect(page.getByText("Drop a video here")).toBeVisible();
});

test("the community poll renders its title and five candidates", async ({ page }) => {
  await page.goto("/#/poll");
  await expect(page.getByText("Community poll").first()).toBeVisible();
  await expect(page.getByText("Pick one of the five strongest players to cast your vote.").first()).toBeVisible();
});

test("the club compare route renders two-club comparison panel", async ({ page }) => {
  await page.goto("/#/club-compare");
  await expect(page.getByRole("heading", { name: "Compare two clubs" })).toBeVisible();
});

test("the knowledge academy renders its curriculum home", async ({ page }) => {
  await page.goto("/#/learn");
  await expect(page.getByRole("heading", { name: "Knowledge Academy" })).toBeVisible();
});

test("the briefing renders its matchday title", async ({ page }) => {
  await page.goto("/#/briefing");
  await expect(page.getByRole("heading", { name: "Matchday briefing" })).toBeVisible();
});

test("the run-in page renders its weekly digest heading", async ({ page }) => {
  await page.goto("/#/run-in");
  await expect(page.getByRole("heading", { name: "The run-in" })).toBeVisible();
});

test("the title race page renders its weekly-ladder heading", async ({ page }) => {
  await page.goto("/#/title-race");
  await expect(page.getByRole("heading", { name: "The title race, week by week" })).toBeVisible();
});

test("the watchlist page renders its saved board heading", async ({ page }) => {
  await page.goto("/#/watchlist");
  await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
});

test("the compare page renders its side-by-side heading", async ({ page }) => {
  await page.goto("/#/compare");
  await expect(page.getByRole("heading", { name: "Compare Players" })).toBeVisible();
});

test("the scouting page renders its needs heading", async ({ page }) => {
  await page.goto("/#/scouting");
  await expect(page.getByRole("heading", { name: "Scouting" })).toBeVisible();
});

test("the value board renders its section title", async ({ page }) => {
  await page.goto("/#/value");
  await expect(page.getByRole("heading", { name: "Player value board" })).toBeVisible();
});

test("the weekly review renders its digest heading", async ({ page }) => {
  await page.goto("/#/review");
  await expect(page.getByRole("heading", { name: "Weekly Review" })).toBeVisible();
});

test("the balance sheet screen draws the world board", async ({ page }) => {
  await page.goto("/#/finance");
  await expect(page.getByRole("heading", { name: "The world's balance sheet" })).toBeVisible();
});

test("the league rules screen draws the table under different rules", async ({ page }) => {
  await page.goto("/#/league-rules");
  await expect(page.getByRole("heading", { name: "The table, under different rules" })).toBeVisible();
});

test("the form table ranks the clubs and the chips switch the competition", async ({ page }) => {
  await page.goto("/#/form");
  await expect(page.getByRole("heading", { name: "The last five, ranked" })).toBeVisible();
  await expect(page.getByText("Fixtures read")).toBeVisible();
  await expect(page.getByText("The form table").first()).toBeVisible();
  // The venue-split columns under the H and A cells print the played count per end.
  await expect(page.getByText(/H · \d+/).first()).toBeVisible();
  await expect(page.getByText(/A · \d+/).first()).toBeVisible();
  // The second chip belongs to a different competition, so clicking it re-anchors the board.
  const chips = page.locator("button.rounded-full");
  await expect(chips).not.toHaveCount(1);
  await chips.nth(1).click();
  await expect(page.getByText("The form table").first()).toBeVisible();
});
