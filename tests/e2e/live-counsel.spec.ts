import { test, expect } from "@playwright/test";

// M1195 live witness: The Counselor — an imprisoned next-step advisor on the Command Center's
// "Your next step" rail. The model never ships a sentence whose numerals the fold cannot re-prove
// off the reader's own facts; any drift is refused and the fold's own reading stands in instead.
// In CI, where the provider is unreachable: the local reading is printed and both outcomes pass.
// Set LLM_LIVE=1 with the armed key reachable (through Clash Verge if needed) to prove the live path.

const LIVE = process.env.LLM_LIVE === "1";
test.setTimeout(180_000);

test("the counsel folds your next step — verified or folded, against your own facts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.addInitScript(() => {
    localStorage.setItem(
      "football-os.state.v2",
      JSON.stringify({
        onboarded: true,
        profile: {
          displayName: "Probe",
          mode: "player",
          positionGroup: "midfielder",
          position: "CM",
          ageGroup: "u18",
          goal: "pro",
          attributes: { passing: 60, finishing: 60, dribbling: 60, ball_control: 60, first_touch: 60, scanning: 60, composure: 60, game_intelligence: 60, positioning: 60, defensive_awareness: 60, sprint: 60, stamina: 60, strength: 60, decision_making: 60 },
          xp: 0,
        },
        sessions: [],
      }),
    );
  });

  await page.goto("/#/", { waitUntil: "domcontentloaded" });

  // The counsel panel exists under the next-step rail.
  const kicker = page.getByText(/THE COUNSEL|问诊|問診/).first();
  await expect(kicker).toBeAttached({ timeout: 30000 });

  const askBtn = page.getByRole("button", { name: /ask the counsel|问一句|問一句/i });

  if (LIVE) {
    await expect(askBtn).toBeVisible({ timeout: 20000 });
    await askBtn.click();
    // The rail settles on a verdict chip within one timeout window — either the model's answer
    // re-proved against your facts ("verified") or the fold's own reading stood in ("rejected").
    const chip = page.getByText(/verified · every numeral re-proved against your own fold|the model drifted/i);
    await expect(chip.first()).toBeVisible({ timeout: 90000 });
  } else {
    // In CI: the live arm prints the via-local note. Either that or the ask button must be present.
    const viaLocal = page.getByText(/asleep in this build|通往实弹模型的通道|通往實彈模型的通道/i);
    expect((await askBtn.count()) + (await viaLocal.count()),
      "the panel must render either the ask button (live path) or the via-local note (keyless arm)").toBeGreaterThan(0);
  }

  expect(errors, `console errors on the counsel live run: ${errors.join(" || ")}`).toHaveLength(0);
});
