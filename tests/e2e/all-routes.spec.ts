import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// M965 — every route in the route table renders inside the shell, for a fresh visitor. This is
// the smoke net under the whole route table: a screen that throws during render blanks the
// shell, and a route whose screen was never mounted prints the build-queue line instead of its
// own heading — both fail here, on every run, without anyone hand-listing what each screen says.
//
// M969 — the net is now derived from the table rather than typed beside it. The spec reads
// src/App.tsx, lifts every `path === "..."` branch and every entry of FOOTBALL_PREFIXES, and
// walks the result; a route added to the app is a route the net already covers, and a parser
// that goes blind fails the coverage assertion instead of silently testing fewer routes.
const APP_SRC = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const EXPLICIT = [...APP_SRC.matchAll(/path === "([^"]+)"/g)]
  .map((m) => m[1])
  // "/" is the landing/dashboard branch and "/onboarding" leaves the shell on purpose; neither
  // draws the sidebar this net hangs on.
  .filter((p) => p !== "/" && p !== "/onboarding");
const PREFIX_BLOCK = APP_SRC.match(/const FOOTBALL_PREFIXES = \[([^\]]+)\]/);
const PREFIXES = PREFIX_BLOCK ? [...PREFIX_BLOCK[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
const ROUTES = [...new Set([...EXPLICIT, ...PREFIXES])];

test("the smoke net covers the whole route table it was derived from", () => {
  // A parser that stops finding branches would still run green on an empty list; this pins the
  // population to the table the app actually draws.
  expect(APP_SRC).toContain("FOOTBALL_PREFIXES");
  expect(EXPLICIT.length).toBeGreaterThanOrEqual(40);
  expect(PREFIXES.length).toBeGreaterThanOrEqual(7);
  expect(ROUTES.length).toBeGreaterThanOrEqual(45);
  // The newest screens and the oldest are both in the net, so neither end of the table drifted
  // out of the read.
  for (const probe of ["/streaks", "/leads", "/clock", "/settings", "/world", "/football"]) {
    expect(ROUTES).toContain(probe);
  }
});

for (const route of ROUTES) {
  test(`the ${route} screen mounts inside the shell`, async ({ page }) => {
    await page.goto(`/#${route}`);
    // The shell is up: the sidebar's first entry is the stable furniture of every mounted page.
    await expect(page.getByText("Command Center").first()).toBeVisible();
    // ...and the page is the screen itself, not the route table's build-queue fallback.
    await expect(page.getByText("This module is next in the build queue")).toBeHidden();
  });
}
