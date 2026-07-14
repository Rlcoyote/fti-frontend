/* global process */
import { defineConfig } from "@playwright/test";

// ─── Playwright E2E config (v28.321, E2E arc) ────────────────────────────────
// The workflow suite — CAM Article XXI: a rule a tool can verify runs as a
// blocking gate. These specs walk the app the way a crew does and assert what
// a USER SEES (visibility, clickability, populated values), because the bug
// classes that reached the field — a dropdown clipped by overflow:hidden, a
// sign link ignored on logged-in phones, PPE boxes seeded from a raw row —
// are invisible to unit tests and to "the build passed."
//
// The app under test is the REAL BUILT BUNDLE served exactly as production
// serves it (`serve dist` with dist/serve.json — same headers, same SPA
// rewrites). The API is route-mocked per spec (e2e/fixtures.js): CORS blocks
// localhost → production API by design, and deterministic fixtures make
// failures mean "the workflow broke," never "the test data drifted."
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npx serve dist -l 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
