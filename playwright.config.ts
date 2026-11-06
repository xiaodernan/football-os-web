import { defineConfig, devices } from "@playwright/test";

// The E2E suite (M459) runs the app the way a visitor does: a real Vite server, a real browser,
// the real deterministic world. The webServer block starts `npm run dev` and waits for the port,
// so `npx playwright test` is the whole command — no second terminal.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  // Vite compiles on demand: the first visit to a heavy route can take seconds on a cold
  // server, and an 8-second expect turns that into a flake. Fifteen is still a real bound —
  // a broken assertion fails on the selector, not on the compiler's speed.
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5199",
    // The suite's anchors are the English dictionary's words; a browser whose own language
    // the i18n detection would follow gets pinned here, so the spec reads the same app in
    // every environment.
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5199",
    reuseExistingServer: true,
    timeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
