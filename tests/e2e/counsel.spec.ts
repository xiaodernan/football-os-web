import { test, expect } from "@playwright/test";

// M1195 · The Counselor — the keyless witness. CI runs without VITE_LLM_ENABLED on the
// preview server, so the panel prints the fold's own reading (never silence, never fake "live").
// Local development with a key shows the streamed counsel after one tap.
test("the dashboard's imprisoned counsel renders its local reading and the ask arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 240)}`); });

  await page.addInitScript(() => {
    localStorage.setItem(
      "football-os.state.v2",
      JSON.stringify({
        onboarded: true,
        profile: { displayName: "Probe", mode: "player", positionGroup: "midfielder", position: "CM", ageGroup: "u18", goal: "pro", attributes: { passing: 60, finishing: 60, dribbling: 60, ball_control: 60, first_touch: 60, scanning: 60, composure: 60, game_intelligence: 60, positioning: 60, defensive_awareness: 60, sprint: 60, stamina: 60, strength: 60, decision_making: 60 }, xp: 0 },
        sessions: [],
      }),
    );
  });

  await page.goto("/#/", { waitUntil: "domcontentloaded" });

  // The counsel panel exists under the next-step links.
  const kicker = page.getByText(/THE COUNSEL|问诊|問診/).first();
  await expect(kicker).toBeAttached({ timeout: 20000 });

  // In the keyless build it prints the local reading; with a key it prints the ask button.
  const askBtn = page.getByRole("button", { name: /ask the counsel|问一句|問一句/ });
  const viaLocal = page.getByText(/asleep in this build|通往实弹模型的通道|通往實彈模型的通道/i);
  expect((await askBtn.count()) + (await viaLocal.count()), "the panel must render either the ask button or the via-local note, never neither").toBeGreaterThan(0);

  expect(errors, `console errors on the dashboard counsel run: ${errors.join(" || ")}`).toHaveLength(0);
});
