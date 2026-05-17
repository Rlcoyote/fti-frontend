import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

// App version for the UI (login screen + dashboard nav). Extracted at build
// time from the most recent `vXX.YY` commit subject so it always reflects the
// deployed ship with zero manual maintenance — the prior hand-kept constants
// drifted 59 versions stale. Scans recent subjects (not just HEAD) so an
// interleaved Dependabot commit, which has no `vXX.YY`, doesn't mask it.
// Defensive: if git is unavailable in the build image, the build still
// succeeds and the UI shows "unknown" rather than failing the deploy.
function resolveAppVersion() {
  try {
    const log = execSync("git log -n 50 --pretty=%s", { encoding: "utf8" });
    const match = log.match(/v\d+\.\d+/);
    return match ? match[0] : "unknown";
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
});
