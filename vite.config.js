import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import process from "node:process";

// App version for the UI (login screen + dashboard nav). Extracted at build
// time from the most recent `vXX.YY` commit subject so it always reflects the
// deployed ship with zero manual maintenance — the prior hand-kept constants
// drifted 59 versions stale.
//
// Two resolution paths, tried in order:
//   1. `git log` — scans 50 recent subjects (not just HEAD) so an interleaved
//      Dependabot commit, which has no `vXX.YY`, doesn't mask the real version.
//      Works anywhere a `.git` dir is present (local dev, full-checkout CI).
//   2. RAILWAY_GIT_COMMIT_MESSAGE — Railway's Railpack builds from a source
//      snapshot with NO `.git` dir, so path 1 always throws there. Railway
//      injects the triggering commit's message as this env var; match the
//      `vXX.YY` out of it. It only carries HEAD, so a Dependabot HEAD would
//      miss — acceptable, since every real ship commit names the version in
//      its subject. This path is why the deployed app showed "unknown".
//
// Defensive: if neither path yields a match the build still succeeds and the
// UI shows "unknown" rather than failing the deploy.
function resolveAppVersion() {
  try {
    const log = execSync("git log -n 50 --pretty=%s", { encoding: "utf8" });
    const match = log.match(/v\d+\.\d+/);
    if (match) return match[0];
  } catch {
    // git unavailable (e.g. Railway build image) — fall through to env var.
  }
  const railwayMatch = (process.env.RAILWAY_GIT_COMMIT_MESSAGE || "").match(/v\d+\.\d+/);
  if (railwayMatch) return railwayMatch[0];
  return "unknown";
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  // Vitest — scope the runner to our own suites under src/. Without an
  // explicit include, `vitest run` walks the whole working directory,
  // including any iCloud-duplicated `node_modules 2/` artifact, and runs
  // third-party packages' own (sometimes failing) test files.
  test: {
    include: ["src/**/*.test.{js,jsx}"],
  },
});
