import { expect, test } from "@playwright/test";

// M1226 · The Forecast Ombudsman behind the shared 123 gate. The device hour and the council's
// stored forecast are seeded deterministically; the model transport is refused (503), so the
// graph must take the honest fold arm: a traced refused edge, the deterministic grade shown
// beside it, and NO publish/contest button (a fold answer is never treated as a proved minute).
const PULSE_KEY = "football-os.pulse.v1";
const RX_KEY = "football-os.rxcouncil.forecast.v1";
const OM_KEY = "football-os.ombudsman.note.v1";

test("the ombudsman refuses an offline model and grades the stored forecast honestly", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/503 \(Service Unavailable\)|offline test/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));
  await page.addInitScript(([pulse, rx, om]) => {
    const now = Date.now();
    localStorage.setItem(pulse, JSON.stringify({
      visits: [
        { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
        { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
        { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
        { path: "/", at: now - 900_000, dwellMs: 2_000 },
        { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
      ],
    }));
    localStorage.setItem(rx, JSON.stringify({
      anomaly: "entryBounce", predicted: 1, rxId: "rx.bounce", at: now - 1_000, locale: "en",
    }));
    localStorage.removeItem(om);
  }, [PULSE_KEY, RX_KEY, OM_KEY]);

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });
  await page.getByLabel(/shared passcode|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/FORECAST OMBUDSMAN \/ 03|预测监察官|預測監察官/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/expected grade|应得等级|應得等級/i)).toBeVisible();
  await page.getByRole("button", { name: /audit the forecast|审查这条预测|審查這條預測/i }).click();
  await expect(page.getByText(/the fold answered|折叠已作答|折疊已作答/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/told from the same replay numbers|由同一批重放数字讲述|由同一批重放數字講述/i)).toBeVisible();
  await expect(page.getByText(/OMBUDSMAN · STATEGRAPH|监察官 · 状态图|監察官 · 狀態圖/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /publish this minute|公布这份纪要|公佈這份紀要/i })).toHaveCount(0);

  expect(errors, `console errors in forecast ombudsman: ${errors.join(" || ")}`).toHaveLength(0);
});
