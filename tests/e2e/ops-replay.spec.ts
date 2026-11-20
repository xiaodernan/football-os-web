import { expect, test } from "@playwright/test";

// M1222 · The Replay Room behind the shared 123 gate. The device hour is seeded deterministically,
// the model transport is refused, and the graph must take the honest fold arm while keeping the
// measured and simulated provenance labels separate.
const PULSE_KEY = "football-os.pulse.v1";

test("the replay room refuses an offline model and keeps both provenance labels", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/503 \(Service Unavailable\)|offline test/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));
  await page.addInitScript((key) => {
    const now = Date.now();
    localStorage.setItem(key, JSON.stringify({
      visits: [
        { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
        { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
        { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
        { path: "/", at: now - 900_000, dwellMs: 2_000 },
        { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
      ],
    }));
  }, PULSE_KEY);

  await page.goto("/#/ops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /the pulse/i })).toBeVisible({ timeout: 20000 });
  await page.getByLabel(/shared passcode|共享口令|共享口令/i).fill("123");
  await page.getByRole("button", { name: /open the console|打开控制台|開啟控制台/i }).click();

  await expect(page.getByText(/THE REPLAY ROOM/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/measured from this device/).first()).toBeVisible();
  await expect(page.getByText(/simulated from a seeded projection/).first()).toBeVisible();

  await page.getByRole("button", { name: /examine the replay/i }).click();
  await expect(page.getByText(/folded answer/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/REPLAY · STATEGRAPH/)).toBeVisible();
  await expect(page.getByText(/without a model:/)).toBeVisible();

  expect(errors, `console errors in replay room: ${errors.join(" || ")}`).toHaveLength(0);
});
