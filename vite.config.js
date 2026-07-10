import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
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

// The building commit's SHA. Locally `git rev-parse HEAD`; on Railway the
// build image has no .git, so fall back to the injected RAILWAY_GIT_COMMIT_SHA
// (the same env family that already feeds __APP_VERSION__ above).
function resolveCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return process.env.RAILWAY_GIT_COMMIT_SHA || "unknown";
  }
}

// Deploy-verification marker for the FRONTEND — the static-site analogue of the
// backend's GET /api/version (v28.217). Bakes the building commit SHA into the
// output so a deploy is verified by SHA MATCH, not by bundle-hash flip (which
// CAM Article XXIII explicitly says is NOT sufficient). Exposed twice:
//   - <meta name="fti-commit"> in index.html — always served, even if an SPA
//     catch-all rewrites unknown paths to index.html
//   - /version.json — clean JSON for scripts/verify-deploy.sh
function deployVersionPlugin(version, sha) {
  return {
    name: "fti-deploy-version",
    transformIndexHtml(html) {
      const tags = `<meta name="fti-version" content="${version}" />\n    <meta name="fti-commit" content="${sha}" />`;
      return html.replace("</head>", `  ${tags}\n  </head>`);
    },
    closeBundle() {
      try {
        writeFileSync(resolve("dist/version.json"), JSON.stringify({ version, commit: sha, commitShort: sha.slice(0, 7) }));
      } catch {
        /* non-fatal — the <meta> tag still carries the SHA */
      }
    },
  };
}

const APP_VERSION = resolveAppVersion();
const COMMIT_SHA = resolveCommitSha();

export default defineConfig({
  plugins: [react(), deployVersionPlugin(APP_VERSION, COMMIT_SHA)],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    // v28.305 — the RUNNING bundle's own commit, so UpdateBanner can compare
    // itself against the served /version.json and detect version skew.
    __COMMIT_SHA__: JSON.stringify(COMMIT_SHA),
  },
  // Vitest — scope the runner to our own suites under src/. Without an
  // explicit include, `vitest run` walks the whole working directory,
  // including any iCloud-duplicated `node_modules 2/` artifact, and runs
  // third-party packages' own (sometimes failing) test files.
  test: {
    include: ["src/**/*.test.{js,jsx}"],
  },
});
