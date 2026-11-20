import { expect, test } from "@playwright/test";

// M1225 · The Prescription Council behind the shared 123 gate. The device hour is seeded
// deterministically, the model transport is refused, and the graph must take the honest fold arm:
// one offered prescription told from the SAME replay numbers, with a traced refused edge and NO
// adoption button (a fold answer is never silently treated as an adopted model proposal).
const PULSE_KEY = "football-os.pulse.v1";
const RX_KEY = "football-os.rxcouncil.forecast.v1";

test("the council refuses an offline model and offers a fold prescription from the replay", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/503 \(Service Unavailable\)|offline test/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));
  await page.addInitScript(([pulse, rx]) => {
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
    localStorage.removeItem(rx);
  }, [PULSE_KEY, RX_KEY]);

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });
  await page.getByLabel(/shared passcode|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/PRESCRIPTION COUNCIL \/ 02|处方委员会|處方委員會/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/rx\./).first()).toBeVisible();

  await page.getByRole("button", { name: /propose the next move|提出下一步/i }).click();
  await expect(page.getByText(/the fold answered|折叠已作答|折疊已作答/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/told from the same replay numbers|由同一批重放数字讲述|由同一批重放數字講述/i)).toBeVisible();
  await expect(page.getByText(/PRESCRIPTION · STATEGRAPH|处方 · 状态图|處方 · 狀態圖/i)).toBeVisible();
  await expect(page.getByText(/proved:0/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /adopt this move|采纳这一步|採納這一步/i })).toHaveCount(0);

  expect(errors, `console errors in prescription council: ${errors.join(" || ")}`).toHaveLength(0);
});
