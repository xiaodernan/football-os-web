import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// M1220 · The Parallel Witness. The M1219 proxy fix was about parallel sessions sharing one
// content-derived cache lane; this measures that shape in REAL browsers, not a mocked timer.
// Sixteen isolated contexts strike the model-chosen door at once against a refused transport.
// Every context must walk the honest refused arm, keep its own storage, and report no console
// error beyond the injected 503. The numbers are written by this run, never hand-typed.
const SESSIONS = 16;
const EVIDENCE = resolve(process.cwd(), "docs/evidence/m1220-parallel-witness.json");

type Row = {
  session: number;
  ms: number;
  fold: boolean;
  badge: boolean;
  traceChips: number;
  storageIntact: boolean;
  errors: string[];
};

test("M1220 · sixteen parallel cartographer sessions keep one honest lane and no cross-talk", async ({ browser }) => {
  const wallStart = Date.now();
  const rows: Row[] = await Promise.all(
    Array.from({ length: SESSIONS }, async (_, session) => {
      const context = await browser.newContext({ locale: "en-US" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (message) => {
        // The 503 is this witness's injected transport refusal, not an app defect.
        if (message.type() === "error" && !/503 \(Service Unavailable\)/.test(message.text())) {
          errors.push(message.text().slice(0, 200));
        }
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 240)}`));
      await page.route("**/api/llm/chat", (route) =>
        route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline witness"}' }));

      const started = Date.now();
      await page.goto("/#/cartographer", { waitUntil: "domcontentloaded" });
      await page.evaluate((id) => localStorage.setItem("m1220-session", String(id)), session);
      const ask = page.getByRole("button", { name: /the model chooses the lens/i });
      await expect(ask).toBeVisible({ timeout: 30000 });
      await ask.click();
      await expect(page.getByText(/model unreachable — the fold answered from the shelves/i)).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/The fold answers instead:/i)).toBeVisible({ timeout: 20000 });

      const body = await page.locator("main").innerText();
      const row: Row = {
        session,
        ms: Date.now() - started,
        fold: /The fold answers instead:/i.test(body),
        badge: /model unreachable — the fold answered from the shelves/i.test(body),
        traceChips: await page.locator("main [title]").count(),
        storageIntact: (await page.evaluate(() => localStorage.getItem("m1220-session"))) === String(session),
        errors,
      };
      await context.close();
      return row;
    }),
  );

  for (const row of rows) {
    expect(row.fold, `session ${row.session} did not take the fold arm`).toBe(true);
    expect(row.badge, `session ${row.session} did not name the honest fallback badge`).toBe(true);
    expect(row.traceChips, `session ${row.session} lost its traced graph`).toBeGreaterThan(0);
    expect(row.storageIntact, `session ${row.session} leaked storage across contexts`).toBe(true);
    expect(row.errors, `session ${row.session} console: ${row.errors.join(" || ")}`).toHaveLength(0);
  }

  const evidence = {
    milestone: "M1220",
    generatedAt: new Date().toISOString(),
    sessions: SESSIONS,
    wallMs: Date.now() - wallStart,
    maxSessionMs: Math.max(...rows.map((r) => r.ms)),
    minSessionMs: Math.min(...rows.map((r) => r.ms)),
    allOk: rows.every((r) => r.fold && r.badge && r.traceChips > 0 && r.storageIntact && r.errors.length === 0),
    transport: "POST /api/llm/chat fulfilled with 503 in every context — no live model call",
    rows,
  };
  mkdirSync(dirname(EVIDENCE), { recursive: true });
  writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  expect(evidence.allOk).toBe(true);
});
